import {
  getDb,
  LivechatMessagesDao,
  SocketConnectionsDao,
} from "@youtube-toolbox/backend";
import { Credentials } from "google-auth-library";
import { youtube_v3 } from "@googleapis/youtube";
import { createLogger } from "../utils/logger";
import { fetchLivechat } from "../youtube/livechat";
import { IDestination, IPublisher } from "./pubsub";

const db = getDb();
const socketConnectionsDao = new SocketConnectionsDao(db);
const livechatMessagesDao = new LivechatMessagesDao(db);

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

export function parseQueueNextPage(body: string): IQueueNextPage {
  const payload = JSON.parse(body);
  if (payload.type !== "queueNextPage") {
    throw new Error(`Unknown action: ${body}`);
  }
  return payload;
}

export async function fetchNewLivechat(
  message: IQueueNextPage,
  topic: string,
  send: (
    destination: IDestination,
    data: youtube_v3.Schema$LiveChatMessageListResponse | null
  ) => Promise<void>,
  publish: IPublisher<IQueueNextPage>
) {
  logger.info("Received message");
  const now = Date.now();
  if (now < message.requestAgainAt) {
    logger.debug(`Waiting ${message.requestAgainAt - now}ms`);
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
    logger.debug(`Fetching next page: ${moreLivechat.nextPageToken}`);
    // update livechat message with the nextPageToken
    await livechatMessagesDao.createOrUpdate(
      message.livechatId,
      moreLivechat.nextPageToken,
      moreLivechat.pollingIntervalMillis,
      moreLivechat
    );
    // get all destinations
    const openSocketConnections = await socketConnectionsDao.getByLiveChatId(
      message.livechatId
    );
    if (openSocketConnections.length > 0) {
      logger.debug(`Sending next check for livechatId: ${message.livechatId}`);
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
    } else {
      logger.debug(
        `No open socket connections for livechatId: ${message.livechatId}`
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
}
