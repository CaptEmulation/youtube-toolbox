#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { SopsStack } from "./sops";
import { FunctionStack } from "./functions";
import { WwwStack } from "./www";
import { DevStack } from "./dev";
const app = new cdk.App();

new SopsStack(app, "Sops");
new FunctionStack(app, "Functions", {});
new DevStack(app, "Dev", {});
new WwwStack(app, "Www", {
  webSocketEndpoint: "dqzlg7k26j.execute-api.us-east-2.amazonaws.com/Prod",
});
