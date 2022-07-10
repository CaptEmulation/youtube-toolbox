import { ApiGatewayManagementApi } from "@aws-sdk/client-apigatewaymanagementapi";
import type { TAllOutgoingActions } from "@youtube-toolbox/models";
import type { SQSHandler } from "aws-lambda";
import { createLogger } from "../utils/logger";
import { parseLazyMessage } from "../queue/message";
import { sendAction } from "../socket";

const logger = createLogger({
  name: "youtube-toolbox/sqs-lazy-message",
});
export const handler: SQSHandler = async (event) => {
  for (const record of event.Records) {
    const { body } = record;
    const { Message: message } = JSON.parse(body);
    try {
      const lazyMessage = parseLazyMessage<TAllOutgoingActions>(message);
      const { messageEndpoint, connectionId, payload } = lazyMessage;
      await sendAction(
        new ApiGatewayManagementApi({
          apiVersion: "2018-11-29",
          endpoint: messageEndpoint,
        }),
        connectionId,
        payload
      );
    } catch (err) {
      logger.error(err);
    }
  }
};
