import { getDb, SocketConnectionsDao } from "@youtube-toolbox/backend";
import { Credentials } from "google-auth-library";
import { youtube_v3 } from "@googleapis/youtube";
import { createLogger } from "../utils/logger";
import { fetchLivechat } from "../youtube/livechat";
import {
  IDestination,
  IPublisher,
  ISubscriber,
  setPublisher,
  setSubscriber,
} from "./pubsub";

const db = getDb();
const socketConnectionsDao = new SocketConnectionsDao(db);

const logger = createLogger({
  name: "functions/queue/livechat",
});

export interface IQueueNextPage {
  type: "queueNextPage";
  livechatId: string;
  nextPage: string;
  requestAgainAt: number;
  credentials: Credentials;
}

export function createSubscriber(
  topic: string,
  send: (
    destination: IDestination,
    data: youtube_v3.Schema$LiveChatMessageListResponse | null
  ) => Promise<void>,
  publish: IPublisher<IQueueNextPage>,
  subscribe: ISubscriber<IQueueNextPage>
) {
  logger.debug("Creating global pubsub");
  setPublisher(publish);
  setSubscriber(subscribe);
  subscribe.on(topic, async (message: IQueueNextPage) => {
    logger.info("Received message");
    const now = Date.now();
    if (now < message.requestAgainAt) {
      await new Promise((resolve) =>
        setTimeout(resolve, message.requestAgainAt - now)
      );
    }
    const moreLivechat = await fetchLivechat(
      message.credentials,
      message.livechatId,
      message.nextPage
    );

    if (moreLivechat?.nextPageToken && moreLivechat.pollingIntervalMillis) {
      // get all destinations
      const openSocketConnections = await socketConnectionsDao.getByLiveChatId(
        message.livechatId
      );
      if (openSocketConnections.length > 0) {
        await Promise.all(
          openSocketConnections.map((s) =>
            Promise.all([
              socketConnectionsDao.createNextPageLiveChatConnection({
                livechatId: message.livechatId,
                nextPage: moreLivechat.nextPageToken || "",
                ...s,
              }),
              send(
                {
                  connectionId: s.connectionId,
                  messageEndpoint: s.messageEndpoint,
                },
                moreLivechat
              ),
            ])
          )
        );
      }
      // Get current active destinations
      await publish.emit(topic, {
        type: "queueNextPage",
        livechatId: message.livechatId,
        nextPage: moreLivechat.nextPageToken,
        requestAgainAt: Date.now() + moreLivechat.pollingIntervalMillis,
        credentials: message.credentials,
      });
    }
  });
}
