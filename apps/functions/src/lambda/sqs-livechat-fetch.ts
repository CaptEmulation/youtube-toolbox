import { ApiGatewayManagementApi } from "@aws-sdk/client-apigatewaymanagementapi";
import type { TAllOutgoingActions } from "@youtube-toolbox/models";
import type { SQSHandler } from "aws-lambda";
import { createLogger } from "../utils/logger";
import { parseLazyMessage } from "../queue/message";
import { sendAction } from "../socket";
import { fetchNewLivechat, parseQueueNextPage } from "../queue";
import { publishOne } from "../queue/sns";

const logger = createLogger({
  name: "youtube-toolbox/sqs-livechat-fetch",
});

if (!process.env.LIVECHAT_MESSAGE_TOPIC_ARN) {
  throw new Error("LIVECHAT_MESSAGE_TOPIC_ARN not set");
}

const livechatMessageTopicArn = process.env.LIVECHAT_MESSAGE_TOPIC_ARN;

export const handler: SQSHandler = async (event) => {
  for (const record of event.Records) {
    const { body } = record;
    const { Message: message } = JSON.parse(body);
    try {
      const nextPage = parseQueueNextPage(message);
      await fetchNewLivechat(
        nextPage,
        livechatMessageTopicArn,
        async (destination, data) => {
          logger.debug(`Publishing message to ${destination.connectionId}`);
          await sendAction(
            new ApiGatewayManagementApi({
              apiVersion: "2018-11-29",
              endpoint: destination.messageEndpoint,
            }),
            destination.connectionId,
            {
              type: "livechatNewMessages",
              payload: data?.items ?? [],
              nextPage: data?.nextPageToken,
            }
          );
        },
        {
          async emit(destination, data) {
            logger.debug(`Publishing message to ${destination}`);
            await publishOne(data, destination);
          },
        }
      );
    } catch (err) {
      logger.error(err);
    }
  }
};
