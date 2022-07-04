import { APIGatewayProxyHandler } from "aws-lambda";
import { disconnect } from "../socket/disconnect";
import bunyan from "bunyan";

const logger = bunyan.createLogger({
  name: "youtube-toolbox/websocket-disconnect",
});

export const handler = (async (event) => {
  if (!event.requestContext.connectionId) {
    return {
      statusCode: 400,
      body: "Bad Request",
    };
  }
  const connectionId = event.requestContext.connectionId;
  return await disconnect(connectionId);
}) as APIGatewayProxyHandler;
