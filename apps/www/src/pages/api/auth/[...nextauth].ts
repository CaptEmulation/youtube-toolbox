import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { DynamoDBAdapter } from "@next-auth/dynamodb-adapter";
import { createDynamoDb } from "@youtube-toolbox/backend";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { SSM } from "@aws-sdk/client-ssm";
import { NextApiHandler, NextApiRequest, NextApiResponse } from "next";

interface IWwwParams {
  readonly sessionsTable: string;
  readonly dynamoDbRegion: string;
}

export async function fetchOptions(): Promise<IWwwParams> {
  if (
    !process.env.SSM_WWW_PARAMS ||
    process.env.DYNAMODB_REGION === "local-env"
  ) {
    return {
      sessionsTable: "Sessions",
      dynamoDbRegion: "local-env",
    };
  }
  console.log(`Fetching www params... from ${process.env.SSM_WWW_PARAMS}`);

  const ssm = new SSM({
    region: "us-east-1",
  });

  const result = await ssm.getParameter({
    Name: process.env.SSM_WWW_PARAMS || "",
  });
  const options = JSON.parse(result.Parameter?.Value ?? "{}");
  return {
    sessionsTable: options.sessionsTable,
    dynamoDbRegion: options.dynamoDbRegion,
  };
}

const DAYS_30 = 30 * 24 * 60 * 60; // 30 days
export default (async (req: NextApiRequest, res: NextApiResponse) => {
  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
    throw new Error(
      "NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set. Please set it in your environment."
    );
  }
  if (!process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error(
      "GOOGLE_CLIENT_SECRET is not set. Please set it in your environment."
    );
  }
  const { sessionsTable, dynamoDbRegion } = await fetchOptions();

  const db = DynamoDBDocument.from(
    createDynamoDb({
      region: dynamoDbRegion,
    }),
    {
      marshallOptions: {
        convertEmptyValues: true,
        removeUndefinedValues: true,
        convertClassInstanceToMap: true,
      },
    }
  );

  return NextAuth({
    session: {
      strategy: "database",
      maxAge: DAYS_30,
    },

    providers: [
      GoogleProvider({
        clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        authorization: {
          params: {
            prompt: "consent",
            access_type: "offline",
            response_type: "code",
            scope:
              "openid email profile https://www.googleapis.com/auth/youtube",
          },
        },
      }),
    ],
    adapter: DynamoDBAdapter(db, {
      tableName: sessionsTable,
    }),
  })(req, res);
}) as NextApiHandler;
