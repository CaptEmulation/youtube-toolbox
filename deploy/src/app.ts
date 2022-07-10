#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import path from "path";
import { SopsStack } from "./sops";
import { FunctionStack } from "./functions";
import { WwwStack } from "./www";
import { DevStack } from "./dev";
const app = new cdk.App();

new SopsStack(app, "Sops");
const { sessionsTable, websocketApi } = new FunctionStack(app, "Functions", {
  env: {
    account: process.env.CDK_DEPLOY_ACCOUNT,
    region: "us-east-1",
  },
  dotFile: path.resolve(__dirname, "../../secrets/.env.auth.enc"),
});
new DevStack(app, "Dev", {});
new WwwStack(app, "Www", {
  websocketApi,
  sessionsTable,
  env: {
    account: process.env.CDK_DEPLOY_ACCOUNT,
    region: "us-east-1",
  },
});
