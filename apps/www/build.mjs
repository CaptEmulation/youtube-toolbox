#!/usr/bin/env node
import "source-map-support/register.js";
import { parse } from "dotenv"
import { spawnSync } from 'child_process';
import { unlinkSync, writeFileSync, renameSync } from "fs";
import pkg from '@sls-next/lambda-at-edge';
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const { Builder } = pkg;
const __dirname = dirname(fileURLToPath(import.meta.url));



try {
  renameSync(resolve(__dirname, "./.env.local"), resolve(__dirname, "./.env.backup"));
  const { stdout } = spawnSync("sops", ["--decrypt", ".env.production.enc"], {
    env: process.env,
    cwd: __dirname,
  });
  const env = parse(stdout);
  process.env = { ...process.env, ...env };
  const builder = new Builder(
    ".",
    "../../deploy/.layers",
    {
      args: ["build", "--no-lint"],
    }
  );
  await builder
    .build();
  console.log("Build complete");
} catch (error) {
  console.error(error);
} finally {
  renameSync(resolve(__dirname, "./.env.backup"), resolve(__dirname, "./.env.local"));
}
