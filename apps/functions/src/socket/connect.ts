import { DynamoDBAdapter } from "@next-auth/dynamodb-adapter";
import {
  SocketConnectionModel,
  TAllOutgoingActions,
} from "@youtube-toolbox/models";
import {
  SocketConnectionsDao,
  UserSessionDao,
  getDb,
  createDynamoDb,
} from "@youtube-toolbox/backend";
import { fromUserToCredentials } from "../utils/credentials";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyResult } from "aws-lambda";
import { createLogger } from "../utils/logger";

const logger = createLogger({
  name: "youtube-toolbox/socket/connect",
});

const db = getDb();
const socketConnectionsDao = new SocketConnectionsDao(db);
const userSessionDao = new UserSessionDao(db);

const sessionAdapter = DynamoDBAdapter(
  DynamoDBDocument.from(createDynamoDb(), {
    marshallOptions: {
      convertEmptyValues: true,
      removeUndefinedValues: true,
      convertClassInstanceToMap: true,
    },
  }),
  {
    tableName: process.env.TABLE_NAME_SESSION || "Sessions",
  }
);
export async function connect(
  connectionId: string,
  messageEndpoint: string,
  sessionFromCookie: string,
  send: (data: TAllOutgoingActions) => Promise<void>
): Promise<APIGatewayProxyResult> {
  logger.info("Received connection request");
  const [sessionResponse, tokenResponse] = await userSessionDao.getUserSession(
    sessionFromCookie
  );
  if (!tokenResponse) {
    logger.warn("No token in response");
    return {
      statusCode: 401,
      body: "Unauthorized",
    };
  }
  const user = tokenResponse;
  logger.info("Found user token");
  try {
    await socketConnectionsDao.createOrUpdateSocketConnection(
      SocketConnectionModel.fromGoogleCredentials({
        connectionId,
        messageEndpoint,
        credentials: fromUserToCredentials(user),
      })
    );
    logger.info("Created or updated socket connection");
  } catch (err) {
    logger.error("Failed to create or update socket connection", err);
    return {
      statusCode: 500,
      body: "Internal Server Error",
    };
  }
  logger.info(`Socket connection created for ${sessionResponse.userId}`);
  await send({
    type: "connected",
  });
  return {
    statusCode: 200,
    body: "OK",
  };
}
