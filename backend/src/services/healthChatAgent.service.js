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

let textAgentPromise;

async function getTextAgent() {
  if (!textAgentPromise) {
    const [{ ChatGroq }, { createReactAgent }, { DynamicTool }] = await Promise.all([
      import("@langchain/groq"),
      import("@langchain/langgraph/prebuilt"),
      import("@langchain/core/tools"),
    ]);

    const webSearchTool = new DynamicTool({
      name: "web_search",
      description: "Search the web for nutritional information on obscure regional food items, dishes, or supplements. Input should be a short search query.",
      func: async (query) => {
        try {
          const fetchObj = (await import("node-fetch")).default || global.fetch;
          const res = await fetchObj(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`);
          const html = await res.text();
          const snippets = [...html.matchAll(/<a class="result__snippet[^>]*>(.*?)<\/a>/g)].map(m => m[1].replace(/<[^>]+>/g, ''));
          return snippets.slice(0, 3).join("\n") || "No results found.";
        } catch (e) {
          return "Search failed.";
        }
      }
    });

    const model = new ChatGroq({
      apiKey: env.groq.apiKey,
      model: env.groq.chatModel,
      temperature: 0.1,
      maxRetries: 2,
    });

    textAgentPromise = createReactAgent({
      llm: model,
      tools: [webSearchTool],
    });
  }
  return textAgentPromise;
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

const COUNT_WORD_TO_NUMBER = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

function extractQuantityHint(text = "") {
  const normalizedText = String(text || "").trim().toLowerCase();

  if (!normalizedText) {
    return "";
  }

  const quantityMatch = normalizedText.match(
    /\b(\d+(?:\.\d+)?|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(plates?|bowls?|servings?|pieces?|pcs|dosas?|idlis?|rotis?|chapatis?|parathas?|samosas?|bhaturas?|eggs?|bananas?)\b/i
  );

  if (!quantityMatch) {
    return "";
  }

  const rawCount = quantityMatch[1].toLowerCase();
  const count =
    COUNT_WORD_TO_NUMBER[rawCount] != null
      ? COUNT_WORD_TO_NUMBER[rawCount]
      : Number(rawCount);
  const unit = quantityMatch[2];

  if (!Number.isFinite(count) || count <= 0) {
    return "";
  }

  return `Detected quantity hint: ${count} ${unit}. Scale the nutrition approximately in proportion to this quantity. For example, 2 plates should be about 2x one standard plate unless the user explicitly describes a different portion size.`;
}

function buildUserPrompt(payload, memoryBlock = "") {
  const sections = [];
  const quantityHint = extractQuantityHint(payload.message);

  if (payload.type === "image") {
    sections.push(
      [
        "The user shared an image for health-focused analysis.",
        `User request: ${
          payload.message ||
          "Analyze this image for food, supplements, tablet labels, calories, macros, micronutrients, ingredients, or fitness relevance only. If the image is unclear, ask for a clearer image or ask the user to type what they ate or took."
        }`,
        `Image URL: ${payload.imageUrl}`,
        quantityHint,
        "Use the image-analysis tool to analyze the image for health, nutrition, supplements, tablet labels, macros, micronutrients, meal composition, or fitness relevance. If the label or meal is unreadable, ask for a clearer image or a typed entry instead of guessing.",
      ].join("\n")
    );
  } else {
    // Current user message always comes first so the model addresses it before any historical context.
    sections.push(payload.message);
    if (quantityHint) {
      sections.push(quantityHint);
    }
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

CRITICAL OUTPUT FORMAT:
- Dish Name: [short suitable title for the image or meal]
- Calories: [single integer]
- Protein: [X]g
- Carbs: [X]g
- Dietary Fibre: [X]g
- Starch: [X]g
- Sugar: [X]g
- Added Sugars: [X]g
- Sugar Alcohols: [X]g
- Other Carbs: [X]g
- Net Carbs: [X]g
- Fat: [X]g
- Saturated Fat: [X]g
- Trans Fat: [X]g
- Polyunsaturated Fat: [X]g
- Monounsaturated Fat: [X]g
- Other Fat: [X]g
- Cholesterol: [X]mg
- Sodium: [X]mg
- Calcium: [X]mg
- Iron: [X]mg
- Potassium: [X]mg
- Vitamin A: [X] IU
- Vitamin C: [X]mg
- Vitamin D: [X] IU

CONSISTENCY RULES:
- Use only single-value estimates. Never use ranges, tildes, or approximations symbols.
- Total carbs MUST equal Dietary Fibre + Starch + Sugar + Sugar Alcohols + Other Carbs.
- Net Carbs MUST equal Total Carbs - Dietary Fibre - Sugar Alcohols.
- Total fat MUST equal Saturated Fat + Trans Fat + Polyunsaturated Fat + Monounsaturated Fat + Other Fat.
- Added Sugars must never exceed Sugar.
- Quantity scaling MUST be realistic and roughly proportional. If the user mentions or the image shows 2 of the same item, estimate about 2x one item unless the visible portion size is clearly smaller.
- For repeated dishes like 2 chole bhature, 2 dosas, or 3 samosas, count the visible number of pieces/plates and scale from one standard item instead of inflating the meal as if each item were an oversized combo platter.
- When multiple items are present, total the clearly visible items once each. Do not double-count the same curry, bread, or side dish.
- If quantity is ambiguous, prefer a conservative realistic estimate and explain the assumption briefly.
- If a value is truly negligible, write 0 in the same format.
- If the image shows a supplement, vitamin, mineral, capsule strip, or tablet bottle/box, treat it as a valid nutrition log item.
- For supplement images, you may use "Supplement Name" instead of "Dish Name", but still include the same structured nutrient lines so the app can log micronutrients.
- Use the visible label when possible. If the exact amounts are unreadable or the image is blurry, do not invent label values. Ask for a clearer image or ask the user to type what they ate or took.
- After the structured nutrition block, provide a brief health-focused explanation of what is visible and why these estimates were chosen.`;

  const completion = await groq.chat.completions.create({
    model: env.groq.visionModel,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content:
          "You are a strict health and fitness image analyst. Identify visible food items, drinks, supplements, vitamin/mineral tablet labels, meals, or ingredients and provide precise nutritional estimates. Only describe health-relevant details such as food items, supplement labels, calorie estimates, macro estimates, micronutrient amounts, hydration cues, exercise context, body posture, or fitness equipment. If the image is unrelated to health or fitness, say so clearly and refuse unrelated analysis. If the image is too unclear to read the meal or supplement label, ask for a clearer image or ask the user to type what they ate or took instead of guessing. Before responding, verify the arithmetic consistency of every total against its subcomponents." + macroFormatInstruction,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              (payload.message ||
              "Analyze this image for food items or supplement labels and provide the nutritional breakdown including calories, macros, and micronutrients. If the image is unclear, ask for a clearer image or ask the user to type what they ate or took.") + macroFormatInstruction,
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
    const [{ default: Groq }] = await Promise.all([import("groq-sdk")]);
    const groq = new Groq({
      apiKey: env.groq.apiKey,
    });

    const messages = [
      { role: "system", content: prompts.text },
      ...(systemContextMessage ? [{ role: "system", content: systemContextMessage }] : []),
      ...recentMessages.slice(-env.chatMemory.promptRecentTurns).map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.message,
      })),
      { role: "user", content: userPrompt }
    ];

    const completion = await groq.chat.completions.create({
      model: env.groq.chatModel,
      temperature: 0.1,
      messages,
    });

    return completion.choices?.[0]?.message?.content?.trim() || "";
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
