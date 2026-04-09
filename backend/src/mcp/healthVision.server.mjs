import path from "path";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

dotenv.config({
  path: path.resolve(import.meta.dirname, "../../.env"),
});

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const visionModel =
  process.env.HEALTH_VISION_MODEL ||
  "meta-llama/llama-4-scout-17b-16e-instruct";

if (!process.env.GROQ_API_KEY) {
  throw new Error("GROQ_API_KEY is required for the health vision MCP server.");
}

const server = new Server(
  {
    name: "health-vision-mcp-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "extract_health_image_details",
      description:
        "Analyze a public image URL only for health, nutrition, food, calories, macros, ingredients, exercise, or fitness-relevant details.",
      inputSchema: {
        type: "object",
        properties: {
          imageUrl: {
            type: "string",
            description:
              "A publicly accessible image URL. The model provider fetches it directly, so authenticated URLs are not supported.",
          },
          focus: {
            type: "string",
            description:
              "Optional health-focused instruction such as meal analysis, calorie estimate, macros, or fitness relevance.",
          },
        },
        required: ["imageUrl"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "extract_health_image_details") {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const { imageUrl, focus } = request.params.arguments ?? {};

  if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
    throw new Error(
      "imageUrl must be a public http or https URL for health image analysis."
    );
  }

  // The MCP tool keeps image reasoning constrained to health and fitness, even when the main chat agent delegates to it.
  const completion = await groq.chat.completions.create({
    model: visionModel,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content:
          "You are a strict health and fitness image analyst. Only describe health-relevant or nutrition-relevant details such as food items, meals, ingredients, calorie estimates, macro estimates, hydration cues, exercise context, body posture, or fitness equipment. If the image is unrelated to health or fitness, say so clearly and refuse unrelated analysis.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              focus ||
              "Analyze this image only for health, nutrition, macros, meal composition, or fitness relevance.",
          },
          {
            type: "image_url",
            image_url: {
              url: imageUrl,
            },
          },
        ],
      },
    ],
  });

  return {
    content: [
      {
        type: "text",
        text:
          completion.choices?.[0]?.message?.content ||
          "No health-related image details were returned.",
      },
    ],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
