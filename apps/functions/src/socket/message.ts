import type { APIGatewayProxyResult } from "aws-lambda";
import {
  SocketConnectionsDao,
  getDb,
  createDynamoDb,
} from "@youtube-toolbox/backend";
import { DynamoDBAdapter } from "@next-auth/dynamodb-adapter";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import {
  ISocketConnection,
  TAllIncomingActions,
} from "@youtube-toolbox/models";
import { handleIncomingMessage, sendAction } from "../socket/handler";
import {
  SocketConnectionModel,
  TAllOutgoingActions,
} from "@youtube-toolbox/models";
import { createLogger } from "../utils/logger";

const logger = createLogger({
  name: "youtube-toolbox/socket/message",
});

const db = getDb();
const socketConnectionsDao = new SocketConnectionsDao(db);

export async function message(
  connectionId: string,
  messageEndpoint: string,
  body: string,
  send: (data: TAllOutgoingActions) => Promise<void>
): Promise<APIGatewayProxyResult> {
  logger.info(`Received message from ${connectionId} with body: ${body}`);
  let socketConnection: ISocketConnection;
  try {
    const socketConnectionResponse =
      await socketConnectionsDao.getByConnectionId(
        connectionId,
        messageEndpoint
      );
    if (!socketConnectionResponse) {
      logger.warn(`No socket connection found for ${connectionId}`);
      return {
        statusCode: 401,
        body: "Unauthorized",
      };
    }
    socketConnection = socketConnectionResponse;
  } catch (err) {
    logger.error("Failed to create or update socket connection", err);
    return {
      statusCode: 500,
      body: "Internal Server Error",
    };
  }
  try {
    const bodyStr = body;
    if (!bodyStr) {
      logger.warn("No body in request");
      return {
        statusCode: 400,
        body: "Bad Request",
      };
    }
    const action: TAllIncomingActions = JSON.parse(bodyStr);

    await handleIncomingMessage(
      action,
      SocketConnectionModel.fromJson(socketConnection),
      send
    );
  } catch (err: any) {
    logger.error("Failed to process message", err);
    await send({
      type: "error",
      payload: {
        message: err.message,
      },
    });
    return {
      statusCode: 500,
      body: "Internal Server Error",
    };
  }
  return {
    statusCode: 200,
    body: "OK",
  };
}
