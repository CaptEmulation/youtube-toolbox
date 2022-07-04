import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { DynamoDBAdapter } from "@next-auth/dynamodb-adapter";
import { createDynamoDb } from "@youtube-toolbox/backend";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";

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

const db = DynamoDBDocument.from(createDynamoDb(), {
  marshallOptions: {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
});

const DAYS_30 = 30 * 24 * 60 * 60; // 30 days
export default NextAuth({
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
          scope: "openid email profile https://www.googleapis.com/auth/youtube",
        },
      },
    }),
  ],
  adapter: DynamoDBAdapter(db, {
    tableName: process.env.TABLE_NAME_SESSION || "Sessions",
  }),
});
