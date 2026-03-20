#!/usr/bin/env node

import { Writable } from "node:stream";
import * as readline from "node:readline/promises";
import { searchFromInput } from "./core/search.js";
import {
  getConfigPath,
  loadConfig,
  resolveModel,
  saveConfig,
} from "./execution/config.js";
import {
  DEFAULT_OPENAI_MODEL,
  buildSearchInput,
  isHelpFlag,
} from "./execution/build-search-input.js";
import type { SearchInput, SearchResult } from "./types.js";

function printHelp(): void {
  console.log("Usage: quark <query...>");
  console.log("Example: quark react website setup guide");
  console.log("");
  console.log("Commands");
  console.log("  quark api      Save your OpenAI API key for future runs");
}

function printInput(input: SearchInput): void {
  console.log("SearchInput");
  console.log(`- rawQuery: ${input.rawQuery}`);
  console.log(`- goal: ${input.goal}`);
  console.log(`- domain: ${input.domain}`);
  console.log(`- possibleTechs: ${input.possibleTechs.join(", ") || "(none)"}`);
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

async function runApiSetup(): Promise<void> {
  const config = await loadConfig();
  const apiKey = await promptForSecret("Paste your OpenAI API key: ");

  if (!apiKey) {
    throw new Error("API key setup was cancelled.");
  }

  await saveConfig({
    ...config,
    apiKey,
    model: DEFAULT_OPENAI_MODEL,
  });

  console.log(`Saved API key to ${getConfigPath()}`);
  console.log(`Default model: ${DEFAULT_OPENAI_MODEL}`);
}

export async function runCli(argv: string[]): Promise<void> {
  if (argv.length === 0 || isHelpFlag(argv[0])) {
    printHelp();
    process.exitCode = argv.length === 0 ? 1 : 0;
    return;
  }

  if (argv[0] === "api") {
    await runApiSetup();
    return;
  }

  const model = await resolveModel(DEFAULT_OPENAI_MODEL);
  const input = await buildSearchInput(argv);
  const results = await searchFromInput(input);

  console.log(`Using model: ${model}`);
  printInput(input);
  printResults(results);
}

async function promptForSecret(prompt: string): Promise<string> {
  const mutableStdout = new MutableStdout(process.stdout);
  const rl = readline.createInterface({
    input: process.stdin,
    output: mutableStdout,
    terminal: true,
  });

  try {
    mutableStdout.muted = false;
    process.stdout.write(prompt);
    mutableStdout.muted = true;
    const value = await rl.question("");
    process.stdout.write("\n");
    return value.trim();
  } finally {
    mutableStdout.muted = false;
    rl.close();
  }
}

class MutableStdout extends Writable {
  public muted = false;

  public constructor(private readonly target: NodeJS.WriteStream) {
    super();
  }

  public override _write(
    chunk: string | Buffer,
    encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    if (!this.muted) {
      this.target.write(chunk, encoding);
    }

    callback();
  }
}

runCli(process.argv.slice(2)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(message);
  process.exit(1);
});
