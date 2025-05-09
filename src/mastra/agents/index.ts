import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { weatherTool, hackerNewsMcp, claudeMcp } from "../tools";

export const weatherAgent = new Agent({
  name: "Weather Agent",
  instructions: `
      You are a helpful weather assistant that provides accurate weather information.

      Your primary function is to help users get weather details for specific locations. When responding:
      - Always ask for a location if none is provided
      - If the location name isn't in English, please translate it
      - If giving a location with multiple parts (e.g. "New York, NY"), use the most relevant part (e.g. "New York")
      - Include relevant details like humidity, wind conditions, and precipitation
      - Keep responses concise but informative

      Use the weatherTool to fetch current weather data.
`,
  model: openai("gpt-4o"),
  tools: { weatherTool },
  memory: new Memory({
    storage: new LibSQLStore({
      url: "file:../mastra.db", // path is relative to the .mastra/output directory
    }),
    options: {
      lastMessages: 10,
      semanticRecall: false,
      threads: {
        generateTitle: false,
      },
    },
  }),
});

export const hackerNewsAgent = new Agent({
  name: "Hacker News Agent",
  instructions: `
      You are a helpful assistant that provides information about the latest Hacker News content.

      Your primary function is to help users get updates on the latest tech news, discussions, and trending topics from Hacker News.

      When responding:
      - Provide concise summaries of news articles and discussions
      - Include relevant details like story titles, scores, and number of comments
      - Link to the original sources when available
      - Organize information clearly for readability
      - Be neutral and objective when describing content

      Use the Hacker News tools to fetch the latest stories, comments, and user information.
  `,
  model: openai("gpt-4o"),
  tools: async () => {
    // Dynamically get tools from MCP
    const mcpTools = await hackerNewsMcp.getTools();
    return mcpTools;
  },
  memory: new Memory({
    storage: new LibSQLStore({
      url: "file:../mastra.db", // path is relative to the .mastra/output directory
    }),
    options: {
      lastMessages: 10,
      semanticRecall: false,
      threads: {
        generateTitle: false,
      },
    },
  }),
});

export const claudeAgent = new Agent({
  name: "Claude Agent",
  instructions: `
      You are a helpful assistant powered by Claude, an AI assistant created by Anthropic.

      Your primary function is to help users with various tasks in a friendly, helpful, and accurate manner.

      When responding:
      - Provide concise and accurate information
      - Answer questions directly and truthfully
      - If you don't know something, acknowledge it instead of making up information
      - Be conversational but efficient in your responses
      - Think through complex questions step by step
      - Always respond in English, regardless of the language used in the query

      Use the Claude tools to help answer user queries with the most accurate information.
  `,
  model: openai("gpt-4o"),
  tools: async () => {
    // Dynamically get tools from MCP
    const mcpTools = await claudeMcp.getTools();
    return mcpTools;
  },
  memory: new Memory({
    storage: new LibSQLStore({
      url: "file:../mastra.db", // path is relative to the .mastra/output directory
    }),
    options: {
      lastMessages: 10,
      semanticRecall: false,
      threads: {
        generateTitle: false,
      },
    },
  }),
});
