import { APIGatewayProxyHandler } from "aws-lambda";
import { connect } from "../socket/connect";
import { requireAuth } from "../socket/auth";
import bunyan from "bunyan";
import { TAllOutgoingActions } from "@youtube-toolbox/models";
import { ApiGatewayManagementApi } from "aws-sdk";
import { sendAction } from "../socket";

const logger = bunyan.createLogger({
  name: "youtube-toolbox/websocket-connect",
});

export const handler = (async (event) => {
  if (!event.requestContext.connectionId) {
    return {
      statusCode: 400,
      body: "Bad Request",
    };
  }
  const [errResponse, sessionFromCookie] = await requireAuth(
    event.headers.cookie || ""
  );
  if (errResponse) {
    return errResponse;
  }
  const connectionId = event.requestContext.connectionId;
  const messageEndpoint = `${event.requestContext.domainName}/${event.requestContext.stage}`;
  return connect(
    connectionId,
    messageEndpoint,
    sessionFromCookie,
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
}) as APIGatewayProxyHandler;
