import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { Step, Workflow } from "@mastra/core/workflows";
import { createStep } from "@mastra/core/workflows/vNext";
import { z } from "zod";
import { hackerNewsAgent } from "../agents";

const llm = openai("gpt-4o");

const agent = new Agent({
  name: "Weather Agent",
  model: llm,
  instructions: `
        You are a local activities and travel expert who excels at weather-based planning. Analyze the weather data and provide practical activity recommendations.

        For each day in the forecast, structure your response exactly as follows:

        📅 [Day, Month Date, Year]
        ═══════════════════════════

        🌡️ WEATHER SUMMARY
        • Conditions: [brief description]
        • Temperature: [X°C/Y°F to A°C/B°F]
        • Precipitation: [X% chance]

        🌅 MORNING ACTIVITIES
        Outdoor:
        • [Activity Name] - [Brief description including specific location/route]
          Best timing: [specific time range]
          Note: [relevant weather consideration]

        🌞 AFTERNOON ACTIVITIES
        Outdoor:
        • [Activity Name] - [Brief description including specific location/route]
          Best timing: [specific time range]
          Note: [relevant weather consideration]

        🏠 INDOOR ALTERNATIVES
        • [Activity Name] - [Brief description including specific venue]
          Ideal for: [weather condition that would trigger this alternative]

        ⚠️ SPECIAL CONSIDERATIONS
        • [Any relevant weather warnings, UV index, wind conditions, etc.]

        Guidelines:
        - Suggest 2-3 time-specific outdoor activities per day
        - Include 1-2 indoor backup options
        - For precipitation >50%, lead with indoor activities
        - All activities must be specific to the location
        - Include specific venues, trails, or locations
        - Consider activity intensity based on temperature
        - Keep descriptions concise but informative

        Maintain this exact formatting for consistency, using the emoji and section headers as shown.
      `,
});

const forecastSchema = z.array(
  z.object({
    date: z.string(),
    maxTemp: z.number(),
    minTemp: z.number(),
    precipitationChance: z.number(),
    condition: z.string(),
    location: z.string(),
  }),
);

const fetchWeather = new Step({
  id: "fetch-weather",
  description: "Fetches weather forecast for a given city",
  inputSchema: z.object({
    city: z.string().describe("The city to get the weather for"),
  }),
  outputSchema: forecastSchema,
  execute: async ({ context }) => {
    const triggerData = context?.getStepResult<{ city: string }>("trigger");

    if (!triggerData) {
      throw new Error("Trigger data not found");
    }

    const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(triggerData.city)}&count=1`;
    const geocodingResponse = await fetch(geocodingUrl);
    const geocodingData = (await geocodingResponse.json()) as {
      results: { latitude: number; longitude: number; name: string }[];
    };

    if (!geocodingData.results?.[0]) {
      throw new Error(`Location '${triggerData.city}' not found`);
    }

    const { latitude, longitude, name } = geocodingData.results[0];

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_mean,weathercode&timezone=auto`;
    const response = await fetch(weatherUrl);
    const data = (await response.json()) as {
      daily: {
        time: string[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_probability_mean: number[];
        weathercode: number[];
      };
    };

    const forecast = data.daily.time.map((date: string, index: number) => ({
      date,
      maxTemp: data.daily.temperature_2m_max[index],
      minTemp: data.daily.temperature_2m_min[index],
      precipitationChance: data.daily.precipitation_probability_mean[index],
      condition: getWeatherCondition(data.daily.weathercode[index]!),
      location: name,
    }));

    return forecast;
  },
});

const planActivities = new Step({
  id: "plan-activities",
  description: "Suggests activities based on weather conditions",
  execute: async ({ context, mastra }) => {
    const forecast = context?.getStepResult(fetchWeather);

    if (!forecast || forecast.length === 0) {
      throw new Error("Forecast data not found");
    }

    const prompt = `Based on the following weather forecast for ${forecast[0]?.location}, suggest appropriate activities:
      ${JSON.stringify(forecast, null, 2)}
      `;

    const response = await agent.stream([
      {
        role: "user",
        content: prompt,
      },
    ]);

    let activitiesText = "";

    for await (const chunk of response.textStream) {
      process.stdout.write(chunk);
      activitiesText += chunk;
    }

    return {
      activities: activitiesText,
    };
  },
});

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
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    95: "Thunderstorm",
  };
  return conditions[code] || "Unknown";
}

/**
 * Cleans JSON text by removing markdown code block markers
 * @param text - The text containing JSON possibly wrapped in code block markers
 * @returns Cleaned JSON text with code block markers removed
 */
function cleanJsonText(text: string): string {
  let jsonText = text;
  if (jsonText.includes("```json")) {
    jsonText = jsonText.replace(/```json|```/g, "").trim();
  } else if (jsonText.includes("```")) {
    jsonText = jsonText.replace(/```/g, "").trim();
  }
  return jsonText;
}

const weatherWorkflow = new Workflow({
  name: "weather-workflow",
  triggerSchema: z.object({
    city: z.string().describe("The city to get the weather for"),
  }),
})
  .step(fetchWeather)
  .then(planActivities);

// Create a step that uses the hackerNewsAgent using vNext API

//outputSchema: z.array(
//  z.object({
//    title: z.string().optional(),
//    url: z.string().optional(),
//    link_to_download: z.string().optional(),
//    description: z.string().optional(),
//    score: z.number().optional(),
//    date: z.string().optional(),
//  })
//),
const NEWS_NUM_TO_FETCH = 1;
const hackerNewsFetchLatestStep = createStep({
  id: "hacker-news-fetch-latest",
  description:
    "Fetches the latest stories from Hacker News using hackerNewsAgent",
  outputSchema: z.array(
    z.object({
      title: z.string().optional(),
      url: z.string().optional(),
      link_to_download: z.string().optional(),
      description: z.string().optional(),
      score: z.number().optional(),
      date: z.string().optional(),
    }),
  ),
  execute: async ({ mastra }) => {
    const agent = mastra?.agents?.hackerNewsAgent;

    if (!agent) {
      throw new Error("Hacker News Agent not found");
    }

    let prompt = `
      ## instruction
      You are an excellent web news curator.
      Retrieve the top ${NEWS_NUM_TO_FETCH} news from Hacker News and include the contents of each article.
      Return the output in JSON format. Do not include anything other than JSON data in the output.
      This response is expected to be parsable with JSON.parse()

      ## Output json format
      [
        {
          "title" :{title}
          "url" :{url}
          "link_to_download" :{link_to_download}
          "description" :{description}
          "score" :{score}
          "date" :{date}
        }
      ]
      `;

    const response = await agent.generate([
      {
        role: "user",
        content: prompt,
      },
    ]);

    // Parse the JSON response and return as an array of objects
    // Remove code block markers if present (```json and ```)
    const jsonText = cleanJsonText(response.text);
    return JSON.parse(jsonText);
  },
});

const fetchNews = createStep({
  id: "fetch-news-content",
  description: "Fetches the content of news stories using urlToMarkdownAgent",
  inputSchema: z.array(
    z.object({
      title: z.string().optional(),
      url: z.string().optional(),
      link_to_download: z.string().optional(),
      description: z.string().optional(),
      score: z.number().optional(),
      date: z.string().optional(),
    }),
  ),
  outputSchema: z.array(
    z.object({
      title: z.string().optional(),
      url: z.string().optional(),
      link_to_download: z.string().optional(),
      description: z.string().optional(),
      score: z.number().optional(),
      date: z.string().optional(),
      summary: z.string().optional(),
    }),
  ),
  execute: async ({ inputData, context, mastra }) => {
    console.log("Debug - Input Data:", inputData);
    console.log("Debug - Context:", context);

    // Get the news data from the previous step
    const newsItems =
      inputData || context?.steps?.["hacker-news-fetch-latest"]?.output;

    if (!newsItems || !Array.isArray(newsItems)) {
      throw new Error(
        "News items not found or not in expected format - tried both inputData and context.steps",
      );
    }

    // Get the agent from mastra
    const agent = mastra?.getAgents()?.urlToMarkdownAgent;
    if (!agent) {
      throw new Error("url to markdown Agent not found");
    }
    let newsWithSummary = [];
    //TODO(tacogips) split out to each steps and run parallel
    for (const eachNews of newsItems) {
      let prompt = `
        ## Instruction
        You are an excellent web news curator.
        A JSON array containing news article URLs will be passed to you as content.
        Extract the source URLs from the following summarized articles' contents, fetch their content using the web fetch tool. Summarize the retrieved content and attach to the json object in 'summary' field of the json'.

        ## Note on output format
        Please be careful to maintain the original JSON format while only adding the "summary" field

        Return the output in JSON format. Do not include anything other than JSON data in the output.
        This response is expected to be parsable with JSON.parse()

        ## Output json format
        [
          {
            "title" :{title}
            "url" :{url}
            "link_to_download" :{link_to_download}
            "description" :{description}
            "score" :{score}
            "date" :{date}
            "summary" :{summary}
          }
        ]

        ## contents
        \`\`\`json
        ${JSON.stringify(eachNews, null, 2)};
        \`\`\`
       `;

      console.log("fetching news ===============", prompt);

      const response = await agent.generate([
        {
          role: "user",
          content: prompt,
        },
      ]);

      console.log(
        "---- fetched summary response ===============",
        response.text,
      );

      const jsonText = cleanJsonText(response.text);
      newsWithSummary.push(JSON.parse(jsonText));
    }
    return newsWithSummary;
  },
});

const zundaAgent = new Agent({
  name: "Zunda Agent",
  model: llm,
  instructions: `

  You are a translator who interprets English and creates Japanese text according to prompts.
  When translating text into Japanese, use the speech pattern of the character "Zundamon." Zundamon is a cute mascot character who speaks with specific characteristics:

  1. End sentences with "~のだ", "~なのだ", or "~のです" for polite form
  2. Use "〜なのだ" instead of "〜だ" or "〜です"
  3. Refer to yourself as "ぼく" (boku)
  4. Maintain a cute, enthusiastic, and slightly childlike tone
  5. Occasionally use "〜ずんだ" as a special ending
  6. For questions, end with "〜なのだ？" or "〜のだ？"

  Below are translation examples to guide you. Always maintain the original meaning while adapting to Zundamon's speech pattern:

  Standard Japanese → Zundamon Style

  Example 1:
  Standard: "こんにちは、私の名前は田中です。"
  Zundamon: "こんにちはなのだ！ぼくの名前は田中なのだ！"

  Example 2:
  Standard: "この情報は役に立ちますか？"
  Zundamon: "この情報は役に立つのだ？"

  Example 3:
  Standard: "申し訳ありませんが、その質問にはお答えできません。"
  Zundamon: "申し訳ないのだ、その質問には答えられないのだ。"

  Example 4:
  Standard: "今日の天気は晴れです。散歩に行きましょう。"
  Zundamon: "今日の天気は晴れなのだ！散歩に行くのだ！"

  Example 5:
  Standard: "この問題を解決するには、まず原因を特定する必要があります。"
  Zundamon: "この問題を解決するには、まず原因を特定する必要があるのだ！"

  Always maintain the original content and meaning, while applying Zundamon's speech patterns consistently.

      `,
});

const zundaNews = createStep({
  id: "zundarize-news-content",
  description: "cute",
  inputSchema: z.array(
    z.object({
      title: z.string().optional(),
      url: z.string().optional(),
      link_to_download: z.string().optional(),
      description: z.string().optional(),
      score: z.number().optional(),
      date: z.string().optional(),
      summary: z.string().optional(),
    }),
  ),
  outputSchema: z.array(
    z.object({
      text: z.string(),
    }),
  ),
  execute: async ({ inputData, context, mastra }) => {
    // Get the news data from the previous step
    const newsItems =
      inputData || context?.steps?.["fetch-news-content"]?.output;

    if (!newsItems || !Array.isArray(newsItems)) {
      throw new Error(
        "News items not found or not in expected format - tried both inputData and context.steps",
      );
    }

    const agent = zundaAgent;
    let translatedNews = [];
    //TODO(tacogips) split out to each steps and run parallel
    for (const eachNews of newsItems) {
      let prompt = `
        ## Instruction
        You are an excellent web news curator.
        Read the given JSON array, translate the title and summary into Japanese, and connect them in a natural way to make them readable as coherent text.

        ### input json format
        \`\`\`json
        [
          {
            "title" :{title}
            "url" :{url}
            "link_to_download" :{link_to_download}
            "description" :{description}
            "score" :{score}
            "date" :{date}
            "summary" :{summary}
          }
        ]
        \`\`\`

        ## contents
        \`\`\`json
        ${JSON.stringify(eachNews, null, 2)};
        \`\`\`

        ## output text format
        {about title}. {about summary}
       `;

      console.log("fetching news ===============", prompt);

      const response = await agent.generate([
        {
          role: "user",
          content: prompt,
        },
      ]);

      translatedNews.push(response.text);
    }
    return translatedNews;
  },
});

// Create a workflow using the hackerNewsAgent step with vNext API approach
const hackerNewsWorkflow = new Workflow({
  name: "hackernews-workflow",
})
  .step(hackerNewsFetchLatestStep)
  .then(fetchNews)
  .then(zundaNews);

// Commit both workflows
hackerNewsWorkflow.commit();
weatherWorkflow.commit();

export { weatherWorkflow, hackerNewsWorkflow };
