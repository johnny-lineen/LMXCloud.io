import path from "path";
import { fileURLToPath } from "url";
import { FileUsageStore, type UsageStore } from "./store.js";
import { PostgresUsageStore } from "./postgres-store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createUsageStore(): UsageStore {
  if (process.env.DATABASE_URL) {
    return new PostgresUsageStore();
  }

  const dataPath =
    process.env.USAGE_FILE ??
    path.resolve(__dirname, "../../../../data/usage.json");

  return new FileUsageStore(dataPath);
}

export type { KeyUsageStats, RecordUsageInput, UsageStore } from "./store.js";
