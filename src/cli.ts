#!/usr/bin/env node

import { searchFromInput } from "./core/search.js";
import {
  buildSearchInput,
  isHelpFlag,
} from "./execution/build-search-input.js";
import type { SearchInput, SearchResult } from "./types.js";

function printHelp(): void {
  console.log("Usage: quark <query...>");
  console.log("Example: quark react website setup guide");
}

function printInput(input: SearchInput): void {
  console.log("SearchInput");
  console.log(`- rawQuery: ${input.rawQuery}`);
  console.log(`- goal: ${input.goal}`);
  console.log(`- searchQueries: ${input.searchQueries.join(", ")}`);
}

function printResults(results: SearchResult[]): void {
  console.log("");
  console.log("Search Results");

  if (results.length === 0) {
    console.log("- no results yet");
    console.log("- search core is not implemented yet");
    return;
  }

  for (const [index, result] of results.entries()) {
    console.log(`${index + 1}. ${result.title}`);
    console.log(`   ${result.url}`);

    if (result.snippet) {
      console.log(`   ${result.snippet}`);
    }
  }
}

export async function runCli(argv: string[]): Promise<void> {
  if (argv.length === 0 || isHelpFlag(argv[0])) {
    printHelp();
    process.exitCode = argv.length === 0 ? 1 : 0;
    return;
  }

  const input = buildSearchInput(argv);
  const results = await searchFromInput(input);

  printInput(input);
  printResults(results);
}

runCli(process.argv.slice(2)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(message);
  process.exit(1);
});
