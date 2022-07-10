import { APIGatewayProxyHandler } from "aws-lambda";
import { ApiGatewayManagementApi } from "@aws-sdk/client-apigatewaymanagementapi";
import { TAllOutgoingActions } from "@youtube-toolbox/models";
import { sendAction } from "../socket/handler";
import { message } from "../socket/message";
import bunyan from "bunyan";

const logger = bunyan.createLogger({
  name: "youtube-toolbox/websocket-message",
});

export const handler: APIGatewayProxyHandler = async (event) => {
  if (!event.requestContext.connectionId) {
    return {
      statusCode: 400,
      body: "Bad Request",
    };
  }
  try {
    const bodyStr = event.body;
    if (!bodyStr) {
      return {
        statusCode: 400,
        body: "Bad Request",
      };
    }
    const connectionId = event.requestContext.connectionId;
    const messageEndpoint = `${event.requestContext.domainName}/${event.requestContext.stage}`;
    await message(
      connectionId,
      messageEndpoint,
      bodyStr,
      async (data: TAllOutgoingActions) =>
        await sendAction(
          new ApiGatewayManagementApi({
            apiVersion: "2018-11-29",
            endpoint: messageEndpoint,
          }),
          connectionId,
          data
        )
    );
  } catch (err) {
    logger.error("Failed to create or update socket connection", err);
    return {
      statusCode: 500,
      body: "Internal Server Error",
    };
  }
  return {
    statusCode: 200,
    body: "OK",
  };
};
