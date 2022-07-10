import { APIGatewayProxyHandler } from "aws-lambda";
import { connect } from "../socket/connect";
import { requireAuth } from "../socket/auth";
import bunyan from "bunyan";
import { TAllOutgoingActions, TConnectedAction } from "@youtube-toolbox/models";
import { ApiGatewayManagementApi } from "@aws-sdk/client-apigatewaymanagementapi";
import { sendAction } from "../socket";
import { publishOne } from "../queue/sns";
import { ILazyMessage } from "../queue/message";

if (!process.env.LAZY_MESSAGE_TOPIC_ARN) {
  throw new Error("LAZY_MESSAGE_TOPIC_ARN not set");
}

const lazyMessageTopicArn = process.env.LAZY_MESSAGE_TOPIC_ARN;

const logger = bunyan.createLogger({
  name: "youtube-toolbox/websocket-connect",
});

export const handler = (async (event) => {
  logger.info("Received connection request");
  if (!event.requestContext.connectionId) {
    logger.warn("No connectionId in event");
    return {
      statusCode: 400,
      body: "Bad Request",
    };
  }
  logger.info("Checking auth");
  const [errResponse, sessionFromCookie] = await requireAuth(
    event.headers.Cookie || event.headers.cookie || ""
  );
  if (errResponse) {
    logger.warn("Auth failed");
    return errResponse;
  }
  const connectionId = event.requestContext.connectionId;
  const messageEndpoint = `https://${event.requestContext.domainName}/${event.requestContext.stage}`;
  return connect(
    connectionId,
    messageEndpoint,
    sessionFromCookie,
    async (data: TAllOutgoingActions) => {
      const messageId = await publishOne<ILazyMessage<TAllOutgoingActions>>(
        {
          connectionId,
          messageEndpoint,
          payload: data,
          type: "lazy",
        },
        lazyMessageTopicArn
      );
      logger.info(`Published message ${messageId}`);
    }
  );
}) as APIGatewayProxyHandler;
