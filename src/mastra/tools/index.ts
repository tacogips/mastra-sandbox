import { createTool } from "@mastra/core/tools";
import { MCPClient } from "@mastra/mcp";
import { z } from "zod";
import TurndownService from "turndown";

/**
 * Hacker News Message Channel Protocol client
 *
 * This client connects to the Hacker News MCP server to dynamically fetch tools
 * that provide access to Hacker News content, including top stories, comments,
 * and user information. Used by the Hacker News Agent to retrieve the latest
 * tech news, discussions, and trending topics from Hacker News.
 *
 * The client uses the hn-mcp command through stdio for communication.
 */
export const hackerNewsMcp = new MCPClient({
  servers: {
    hackerNews: {
      command: "hn-mcp",
      args: ["stdio"],
    },
  },
});

interface GeocodingResponse {
  results: {
    latitude: number;
    longitude: number;
    name: string;
  }[];
}
interface WeatherResponse {
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    wind_gusts_10m: number;
    weather_code: number;
  };
}

export const weatherTool = createTool({
  id: "get-weather",
  description: "Get current weather for a location",
  inputSchema: z.object({
    location: z.string().describe("City name"),
  }),
  outputSchema: z.object({
    temperature: z.number(),
    feelsLike: z.number(),
    humidity: z.number(),
    windSpeed: z.number(),
    windGust: z.number(),
    conditions: z.string(),
    location: z.string(),
  }),
  execute: async ({ context }) => {
    return await getWeather(context.location);
  },
});

const getWeather = async (location: string) => {
  const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`;
  const geocodingResponse = await fetch(geocodingUrl);
  const geocodingData = (await geocodingResponse.json()) as GeocodingResponse;

  if (!geocodingData.results?.[0]) {
    throw new Error(`Location '${location}' not found`);
  }

  const { latitude, longitude, name } = geocodingData.results[0];

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,weather_code`;

  const response = await fetch(weatherUrl);
  const data = (await response.json()) as WeatherResponse;

  return {
    temperature: data.current.temperature_2m,
    feelsLike: data.current.apparent_temperature,
    humidity: data.current.relative_humidity_2m,
    windSpeed: data.current.wind_speed_10m,
    windGust: data.current.wind_gusts_10m,
    conditions: getWeatherCondition(data.current.weather_code),
    location: name,
  };
};

function getWeatherCondition(code: number): string {
  const conditions: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
  };
  return conditions[code] || "Unknown";
}

export const urlToMarkdownTool = createTool({
  id: "url-to-markdown",
  description: "Fetches content from a URL and converts it to markdown format",
  inputSchema: z.object({
    url: z.string().url().describe("The URL to fetch content from"),
  }),
  outputSchema: z.object({
    markdown: z.string().describe("The fetched content converted to markdown"),
    originalUrl: z.string().describe("The original URL that was fetched"),
  }),
  execute: async ({ context }) => {
    try {
      const response = await fetch(context.url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
      }
      
      const contentType = response.headers.get("content-type") || "";
      
      // Handle HTML content
      if (contentType.includes("text/html")) {
        const html = await response.text();
        const turndownService = new TurndownService();
        const markdown = turndownService.turndown(html);
        
        return {
          markdown,
          originalUrl: context.url,
        };
      } 
      
      // Handle plain text content
      if (contentType.includes("text/plain")) {
        const text = await response.text();
        return {
          markdown: text,
          originalUrl: context.url,
        };
      }
      
      // Handle unsupported content types
      throw new Error(`Unsupported content type: ${contentType}`);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error fetching URL: ${error.message}`);
      }
      throw new Error("Unknown error occurred while fetching URL");
    }
  },
});
