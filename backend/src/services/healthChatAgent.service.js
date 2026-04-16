const path = require("path");

const env = require("../config/env");
const ApiError = require("../utils/apiError");
const { getResolvedSystemPrompts } = require("./chatConfig.service");

let healthAgentPromise;
let healthAgentExpiresAt = 0;
let chatModelPromise;

async function createHealthAgent() {
  if (!env.groq.apiKey) {
    throw new ApiError(
      503,
      "GROQ_API_KEY is required to use the health chat assistant"
    );
  }

  const [{ ChatGroq }, { createReactAgent }, { MultiServerMCPClient }] =
    await Promise.all([
      import("@langchain/groq"),
      import("@langchain/langgraph/prebuilt"),
      import("@langchain/mcp-adapters"),
    ]);

  // The agent uses a local MCP server so image analysis stays modular and can evolve separately from the core chat flow.
  const mcpClient = new MultiServerMCPClient({
    health_vision: {
      transport: "stdio",
      command: "node",
      args: [path.resolve(__dirname, "../mcp/healthVision.server.mjs")],
    },
  });

  const tools = await mcpClient.getTools();
  const model = new ChatGroq({
    apiKey: env.groq.apiKey,
    model: env.groq.chatModel,
    temperature: 0.1,
    maxRetries: 2,
  });
  const prompts = await getResolvedSystemPrompts();

  return createReactAgent({
    llm: model,
    tools,
    stateModifier: prompts.image,
  });
}

async function createChatModel() {
  const [{ ChatGroq }] = await Promise.all([import("@langchain/groq")]);

  return new ChatGroq({
    apiKey: env.groq.apiKey,
    model: env.groq.chatModel,
    temperature: 0.1,
    maxRetries: 2,
  });
}

async function getHealthAgent() {
  if (!healthAgentPromise || Date.now() >= healthAgentExpiresAt) {
    healthAgentPromise = createHealthAgent();
    healthAgentExpiresAt = Date.now() + env.chatConfig.inMemoryTtlMs;
  }

  return healthAgentPromise;
}

async function getChatModel() {
  if (!chatModelPromise) {
    chatModelPromise = createChatModel();
  }

  return chatModelPromise;
}

function mapHistoryToMessages(previousMessages) {
  return previousMessages.slice(-env.chatMemory.promptRecentTurns).map((message) => ({
    role: message.role,
    content: message.message,
  }));
}

function mapHistoryToLangChainMessages(previousMessages, messageTypes) {
  return previousMessages
    .slice(-env.chatMemory.promptRecentTurns)
    .map((message) =>
      message.role === "assistant"
        ? new messageTypes.AIMessage(message.message)
        : new messageTypes.HumanMessage(message.message)
    );
}

function buildUserPrompt(payload, memoryBlock = "") {
  const sections = [];

  if (payload.type === "image") {
    sections.push(
      [
        "The user shared an image for health-focused analysis.",
        `User request: ${payload.message || "Analyze this image for meal, calories, macros, ingredients, or fitness relevance only."}`,
        `Image URL: ${payload.imageUrl}`,
        "Use the image-analysis tool to analyze the image for health, nutrition, macros, meal composition, or fitness relevance.",
      ].join("\n")
    );
  } else {
    // Current user message always comes first so the model addresses it before any historical context.
    sections.push(payload.message);
  }

  if (memoryBlock) {
    // Memory is appended after the current message so the model focuses on the present turn first.
    sections.push(memoryBlock);
  }

  return sections.join("\n\n");
}

function buildSystemContextMessage(userContextSummary = "") {
  if (!userContextSummary) {
    return "";
  }

  // Profile and log state are injected as compact structured text so the model can personalize without replaying full records.
  return `User context:\n${userContextSummary}`;
}

function extractTextContent(content) {
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        return part.text || "";
      })
      .join("\n")
      .trim();
  }

  return String(content || "").trim();
}

async function analyzeImageWithGroqDirectly(payload) {
  const [{ default: Groq }] = await Promise.all([import("groq-sdk")]);
  const groq = new Groq({
    apiKey: env.groq.apiKey,
  });

  const macroFormatInstruction = `

CRITICAL OUTPUT FORMAT — You MUST output the macro breakdown in EXACTLY this format, with no variations, approximations, tildes, or ranges:
- Calories: [single integer]
- Protein: [X]g
- Carbs: [X]g
- Fat: [X]g

If you cannot determine exact values, use your best single-value estimate. Never write "~350" or "350-400" — always write a single integer like "350".`;

  const completion = await groq.chat.completions.create({
    model: env.groq.visionModel,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content:
          "You are a strict health and fitness image analyst. Identify all food items, meals, or ingredients visible in the image and provide precise nutritional estimates. Only describe health-relevant details such as food items, meals, ingredients, calorie estimates, macro estimates, hydration cues, exercise context, body posture, or fitness equipment. If the image is unrelated to health or fitness, say so clearly and refuse unrelated analysis." + macroFormatInstruction,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              (payload.message ||
              "Analyze this image for food items, meal composition, and provide the nutritional breakdown including calories, protein, carbs, and fat.") + macroFormatInstruction,
          },
          {
            type: "image_url",
            image_url: {
              url: payload.imageUrl,
            },
          },
        ],
      },
    ],
  });

  return completion.choices?.[0]?.message?.content?.trim() || "";
}

function extractAssistantReply(agentResult) {
  const messages = agentResult.messages || [];

  for (const message of [...messages].reverse()) {
    const role = message.role || message.getType?.();

    if (role === "assistant" || role === "ai") {
      const content = extractTextContent(message.content);

      if (content) {
        return content;
      }
    }
  }

  throw new ApiError(502, "Health chat agent did not return an assistant reply");
}

async function generateHealthAssistantReply(conversationContext, payload) {
  const recentMessages = conversationContext.recentMessages || [];
  const memoryBlock = conversationContext.memoryBlock || "";
  const userContextSummary = conversationContext.userContextSummary || "";
  const userPrompt = buildUserPrompt(payload, memoryBlock);
  const systemContextMessage = buildSystemContextMessage(userContextSummary);
  const prompts = await getResolvedSystemPrompts();

  if (payload.type !== "image") {
    const [model, messageTypes] = await Promise.all([
      getChatModel(),
      import("@langchain/core/messages"),
    ]);
    // Plain text requests skip the agent loop entirely so we avoid MCP and tool orchestration latency.
    const response = await model.invoke([
      new messageTypes.SystemMessage(prompts.text),
      ...(systemContextMessage
        ? [new messageTypes.SystemMessage(systemContextMessage)]
        : []),
      ...mapHistoryToLangChainMessages(recentMessages, messageTypes),
      new messageTypes.HumanMessage(userPrompt),
    ]);

    return extractTextContent(response.content);
  }

  // Image requests go directly to the Groq vision API — bypassing the MCP agent loop
  // entirely. The agent path (spawn MCP stdio process + two LLM round-trips) added
  // 5-15 s of latency with no quality benefit over a single direct vision call.
  try {
    const directVisionReply = await analyzeImageWithGroqDirectly(payload);

    if (directVisionReply) {
      return directVisionReply;
    }

    throw new ApiError(502, "Image analysis returned an empty response. Please retry.");
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.log("VISION ERROR:", error.stack || error);
    throw new ApiError(
      502,
      "Image analysis is temporarily unavailable. Please retry in a moment."
    );
  }
}

module.exports = {
  generateHealthAssistantReply,
};
