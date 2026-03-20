import type { SearchInput } from "../types.js";

export function isHelpFlag(value: string | undefined): boolean {
  return value === "-h" || value === "--help";
}

export function buildSearchInput(args: string[]): SearchInput {
  const rawQuery = args.join(" ").trim();

  if (!rawQuery) {
    throw new Error("A query is required. Usage: quark <query...>");
  }

  return {
    rawQuery,
    goal: rawQuery,
    possibleTechs: [],
    searchQueries: [rawQuery],
  };
}
