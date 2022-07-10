import { spawnSync } from "child_process";
import { parse } from "dotenv";

export function dotSecret(file: string): Record<string, string> {
  const { stdout: content } = spawnSync("sops", ["--decrypt", file]);
  const parsed = parse(content);
  return parsed;
}
