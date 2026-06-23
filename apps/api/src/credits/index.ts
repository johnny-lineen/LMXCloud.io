import path from "path";
import { fileURLToPath } from "url";
import { FileCreditStore } from "./file-store.js";
import { PostgresCreditStore } from "./postgres-store.js";
import type { CreditStore } from "./store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createCreditStore(): CreditStore {
  if (process.env.DATABASE_URL) {
    return new PostgresCreditStore();
  }

  const dataPath =
    process.env.CREDITS_FILE ??
    path.resolve(__dirname, "../../../../data/credits.json");

  return new FileCreditStore(dataPath);
}

export { calculateRequestCost, roundCredits } from "./pricing.js";
export type { CreditStore } from "./store.js";
