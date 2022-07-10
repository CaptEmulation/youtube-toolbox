import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

let instance: DynamoDBDocumentClient;

export function createDynamoDb(opts?: DynamoDBClientConfig) {
  const isTest = process.env.NODE_ENV === "test";
  const config: DynamoDBClientConfig = {
    ...(isTest
      ? {
          endpoint: "http://localhost:8000",
          region: "local-env",
        }
      : {
          endpoint: process.env.DYNAMODB_ENDPOINT,
          region: process.env.DYNAMODB_REGION,
        }),
    ...opts,
  };
  const ddb = new DynamoDBClient(config);
  return ddb;
}

export function getDb() {
  if (!instance) {
    instance = DynamoDBDocumentClient.from(createDynamoDb(), {
      marshallOptions: {
        convertEmptyValues: true,
        removeUndefinedValues: true,
        convertClassInstanceToMap: true,
      },
    });
  }
  return instance;
}
