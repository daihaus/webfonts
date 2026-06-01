import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import process from "node:process";

if (process.env.npm_command === "pack" || process.env.npm_command === "publish") {
  process.exit(0);
}

if (!existsSync(".git")) {
  process.exit(0);
}

const result = spawnSync("husky", { stdio: "inherit" });
process.exit(result.status ?? 0);
