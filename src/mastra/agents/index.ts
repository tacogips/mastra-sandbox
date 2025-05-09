import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { weatherTool, hackerNewsMcp, urlToMarkdownTool } from "../tools";

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

export const urlToMarkdownAgent = new Agent({
  name: "URL to Markdown Agent",
  instructions: `
      You are a helpful assistant that converts web content to readable markdown format.

      However, if the provided URL's extension is pdf, jpg, png, mp4, or other non-webpage formats, do not execute the fetch operation and return '<couldn't fetch>' as the value.

      Your primary function is to help users get content from URLs in a clean, readable markdown format.

      When responding:
      - Ask for a URL if none is provided
      - Ensure the URL is valid before attempting to process it
      - Format the converted content in a readable way
      - Handle different types of content appropriately
      - Provide a summary of the content when possible

      Use the urlToMarkdownTool to fetch content from URLs and convert it to markdown.



  `,
  //model: openai("gpt-4.1-mini"),
  model: openai("gpt-4o"),
  tools: { urlToMarkdownTool },
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
