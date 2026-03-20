import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export type QuarkConfig = {
  apiKey?: string;
  model?: string;
};

const QUARK_CONFIG_PATH = join(homedir(), ".quark", "config.json");

export function getConfigPath(): string {
  return QUARK_CONFIG_PATH;
}

export async function loadConfig(): Promise<QuarkConfig> {
  try {
    const raw = await readFile(QUARK_CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;

    if (!isConfig(parsed)) {
      throw new Error("Invalid config shape");
    }

    return parsed;
  } catch (error: unknown) {
    if (isMissingFileError(error)) {
      return {};
    }

    throw new Error("Failed to read Quark config.");
  }
}

export async function saveConfig(config: QuarkConfig): Promise<void> {
  await mkdir(dirname(QUARK_CONFIG_PATH), { recursive: true });
  await writeFile(QUARK_CONFIG_PATH, JSON.stringify(config, null, 2), {
    encoding: "utf8",
    mode: 0o600,
  });
}

export async function resolveApiKey(): Promise<string | undefined> {
  if (process.env.OPENAI_API_KEY?.trim()) {
    return process.env.OPENAI_API_KEY.trim();
  }

  const config = await loadConfig();
  return config.apiKey?.trim();
}

export async function resolveModel(
  fallbackModel: string,
): Promise<string> {
  if (process.env.QUARK_OPENAI_MODEL?.trim()) {
    return process.env.QUARK_OPENAI_MODEL.trim();
  }

  const config = await loadConfig();
  return config.model?.trim() || fallbackModel;
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

function isConfig(value: unknown): value is QuarkConfig {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    (candidate.apiKey === undefined || typeof candidate.apiKey === "string") &&
    (candidate.model === undefined || typeof candidate.model === "string")
  );
}
