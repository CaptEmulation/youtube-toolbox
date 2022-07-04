#!/usr/bin/env node
import "source-map-support/register.js";
import "dotenv/config"
import pkg from '@sls-next/lambda-at-edge';
const { Builder } = pkg;

const builder = new Builder(
  ".",
  "../../deploy/.layers",
  {
    args: ["build", "--no-lint"],
  }
);
builder
  .build()
  .then(() => {
    console.log("Build complete");
  })
  .catch((e) => {
    console.log(e);
    process.exit(1);
  });
