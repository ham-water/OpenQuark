import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolveApiKey, resolveModel } from "./config.js";
import type { SearchInput } from "../types.js";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
export const DEFAULT_OPENAI_MODEL = "gpt-5.4-nano-2026-03-17";
const SEARCH_INPUT_EXAMPLES_PATH = fileURLToPath(
  new URL("../../search-input-examples.md", import.meta.url),
);

const searchInputJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["rawQuery", "goal", "domain", "possibleTechs", "searchQueries"],
  properties: {
    rawQuery: {
      type: "string",
      description: "The user's original search request.",
    },
    goal: {
      type: "string",
      description: "A concise statement describing what the user wants to learn or build.",
    },
    domain: {
      type: "string",
      description: "The most relevant topic area for the search intent.",
    },
    possibleTechs: {
      type: "array",
      description: "Technologies, standards, tools, or concepts likely needed for the topic.",
      items: {
        type: "string",
      },
    },
    searchQueries: {
      type: "array",
      description: "A diverse list of concrete search queries for the downstream search engine.",
      items: {
        type: "string",
      },
    },
  },
} as const;

type OpenAIResponse = {
  error?: {
    message?: string;
  };
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

export function isHelpFlag(value: string | undefined): boolean {
  return value === "-h" || value === "--help";
}

export async function buildSearchInput(args: string[]): Promise<SearchInput> {
  const rawQuery = args.join(" ").trim();

  if (!rawQuery) {
    throw new Error("A query is required. Usage: quark <query...>");
  }

  const apiKey = await resolveApiKey();

  if (!apiKey) {
    throw new Error(
      "OpenAI API key is required. Run `quark api` or set OPENAI_API_KEY first.",
    );
  }

  const examples = await readFile(SEARCH_INPUT_EXAMPLES_PATH, "utf8");
  const model = await resolveModel(DEFAULT_OPENAI_MODEL);
  const searchInput = await requestSearchInputFromOpenAI(
    rawQuery,
    examples,
    apiKey,
    model,
  );

  return normalizeSearchInput(searchInput, rawQuery);
}

async function requestSearchInputFromOpenAI(
  rawQuery: string,
  examples: string,
  apiKey: string,
  model: string,
): Promise<SearchInput> {
  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: buildSystemPrompt(examples),
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: rawQuery,
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "search_input",
          strict: true,
          schema: searchInputJsonSchema,
        },
      },
    }),
  });

  const payload = (await response.json()) as OpenAIResponse;

  if (!response.ok) {
    throw new Error(
      payload.error?.message ??
        `OpenAI API request failed with status ${response.status}.`,
    );
  }

  const jsonText = extractOutputText(payload);

  if (!jsonText) {
    throw new Error("OpenAI API returned no structured search schema output.");
  }

  const parsed = JSON.parse(jsonText) as unknown;
  assertIsSearchInput(parsed);
  return parsed;
}

function buildSystemPrompt(examples: string): string {
  return [
    "You convert a user's natural-language software or implementation request into a SearchInput object for a downstream web search engine.",
    "Return only data that fits the provided JSON schema.",
    "Rules:",
    "- Preserve the user's exact input in rawQuery.",
    "- goal must be a concise statement of intent.",
    "- domain must be a short topical category.",
    "- possibleTechs must contain concrete technologies, standards, tools, or security concepts relevant to the request.",
    "- searchQueries must contain 4 to 8 distinct, high-signal web search queries.",
    "- Include both Korean and English queries when that improves search coverage.",
    "- Avoid duplicates, vague filler, and sentences that are too long.",
    "- Prefer production-useful search terms that a real developer would search for.",
    "",
    "Examples:",
    examples,
  ].join("\n");
}

function extractOutputText(payload: OpenAIResponse): string {
  const outputTexts: string[] = [];

  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text) {
        outputTexts.push(content.text);
      }
    }
  }

  return outputTexts.join("").trim();
}

function assertIsSearchInput(value: unknown): asserts value is SearchInput {
  if (typeof value !== "object" || value === null) {
    throw new Error("AI returned an invalid search schema: expected an object.");
  }

  const candidate = value as Record<string, unknown>;

  if (typeof candidate.rawQuery !== "string") {
    throw new Error("AI returned an invalid search schema: rawQuery must be a string.");
  }

  if (typeof candidate.goal !== "string") {
    throw new Error("AI returned an invalid search schema: goal must be a string.");
  }

  if (typeof candidate.domain !== "string") {
    throw new Error("AI returned an invalid search schema: domain must be a string.");
  }

  if (!isStringArray(candidate.possibleTechs)) {
    throw new Error(
      "AI returned an invalid search schema: possibleTechs must be a string array.",
    );
  }

  if (!isStringArray(candidate.searchQueries)) {
    throw new Error(
      "AI returned an invalid search schema: searchQueries must be a string array.",
    );
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function normalizeSearchInput(
  input: SearchInput,
  rawQuery: string,
): SearchInput {
  return {
    rawQuery,
    goal: input.goal.trim(),
    domain: input.domain.trim(),
    possibleTechs: dedupeStrings(input.possibleTechs),
    searchQueries: dedupeStrings(input.searchQueries.length > 0 ? input.searchQueries : [rawQuery]),
  };
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();

    if (!trimmed) {
      continue;
    }

    const key = trimmed.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(trimmed);
  }

  return normalized;
}
