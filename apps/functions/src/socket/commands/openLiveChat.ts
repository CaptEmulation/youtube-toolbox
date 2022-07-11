import {
  getDb,
  LivechatMessagesDao,
  SocketConnectionsDao,
} from "@youtube-toolbox/backend";
import {
  SocketConnectionModel,
  TAllOutgoingActions,
} from "@youtube-toolbox/models";
import type { Credentials } from "google-auth-library";
import { createLogger } from "../../utils/logger";
import { fetchLivechat, findLatestLiveBroadcast } from "../../youtube/livechat";
import type { IPublisher, IQueueNextPage } from "../../queue";

const logger = createLogger({
  name: "youtube-toolbox/socket/commands/openLiveChat",
});

const db = getDb();
const socketConnectionsDao = new SocketConnectionsDao(db);
const livechatMessagesDao = new LivechatMessagesDao(db);

export async function openLiveChat(
  socketConnection: SocketConnectionModel,
  send: (action: TAllOutgoingActions) => Promise<void>,
  publish: IPublisher<IQueueNextPage>
) {
  if (!process.env.LIVECHAT_MESSAGE_TOPIC_ARN) {
    throw new Error("LIVECHAT_MESSAGE_TOPIC is not defined in env");
  }
  const LIVECHAT_MESSAGE_TOPIC_ARN = process.env.LIVECHAT_MESSAGE_TOPIC_ARN;

  const credentials = socketConnection.googleCredentials();
  const livechatId = await findLatestLiveBroadcast(credentials);
  if (!livechatId) {
    logger.info("No live broadcast found");
    return null;
  }

  await socketConnectionsDao.createOrUpdateLiveChatConnection({
    ...socketConnection,
    livechatId,
  });

  // Check if there is already a stream....
  const tipNextPage = await livechatMessagesDao.getTipPageOfLivechat(
    livechatId
  );
  if (tipNextPage) {
    // There is a stream already, so with the socketConnection above, we will start receiving messages
    return;
  }

  // no tip exists, so let's start a new one
  await livechatMessagesDao.createOrUpdateTipPage(livechatId);
  const livechat = await requestMoreMessages({
    livechatId,
    credentials: socketConnection.googleCredentials(),
    send,
  });
  if (!livechat || !livechat.nextPageToken || !livechat.pollingIntervalMillis) {
    logger.info(
      `No livechat found for livechatId: ${livechatId} and nextPageToken: ${livechat?.nextPageToken} and pollingInterval: ${livechat?.pollingIntervalMillis}`
    );
    return;
  }
  // update livechat message with the nextPageToken
  await livechatMessagesDao.createOrUpdate(
    livechatId,
    livechat.nextPageToken,
    livechat.pollingIntervalMillis,
    livechat
  );

  logger.debug(`Publishing next check for livechatId: ${livechatId}`);
  await publish.emit(LIVECHAT_MESSAGE_TOPIC_ARN, {
    type: "queueNextPage",
    credentials,
    livechatId,
    nextPage: livechat.nextPageToken,
    requestAgainAt: Date.now() + livechat.pollingIntervalMillis,
  });
}

export async function requestMoreMessages({
  livechatId,
  nextPage,
  credentials,
  send,
}: {
  livechatId: string;
  nextPage?: string;
  credentials: Credentials;
  send: (action: TAllOutgoingActions) => Promise<void>;
}) {
  logger.debug(`Requesting more messages for livechatId: ${livechatId}`);
  const livechat = await fetchLivechat(credentials, livechatId, nextPage);
  if (!livechat) {
    return null;
  }
  await send({
    type: "livechatNewMessages",
    payload: livechat.items ?? [],
  });
  return livechat;
}
