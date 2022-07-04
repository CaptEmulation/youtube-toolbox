#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
// import { WwwStack } from "./stack";
// import { NetworkStack } from "./network";
import { SopsStack } from "./sops";
import { FunctionStack } from "./functions";
import { WwwStack } from "./www";
const app = new cdk.App();

new SopsStack(app, "Sops");
new FunctionStack(app, "Functions", {});
new WwwStack(app, "Www", {
  webSocketEndpoint: "dqzlg7k26j.execute-api.us-east-2.amazonaws.com/Prod",
});
// new NetworkStack(app, "NetworkStack", {
//   domain: "formclank.com",
//   betaIp: "45.79.240.103",
// });
// new WwwStack(app, `www`, {
//   domain: ["lambda", "formclank.com"],
//   env: {
//     account: process.env.CDK_DEFAULT_ACCOUNT,
//     region: "us-east-1",
//   },
// });
