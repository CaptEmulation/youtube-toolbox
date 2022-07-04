import { getDb, SocketConnectionsDao } from "@youtube-toolbox/backend";
import {
  SocketConnectionModel,
  TAllOutgoingActions,
} from "@youtube-toolbox/models";
import { Credentials } from "google-auth-library";
import { createLogger } from "../../utils/logger";
import { fetchLivechat, findLatestLiveBroadcast } from "../../youtube/livechat";
import { IQueueNextPage, publish } from "../../queue";

const logger = createLogger({
  name: "youtube-toolbox/socket/commands/openLiveChat",
});

const db = getDb();
const socketConnectionsDao = new SocketConnectionsDao(db);

if (!process.env.LIVECHAT_MESSAGE_TOPIC) {
  throw new Error("LIVECHAT_MESSAGE_TOPIC is not defined in env");
}
const LIVECHAT_MESSAGE_TOPIC = process.env.LIVECHAT_MESSAGE_TOPIC;

export async function openLiveChat(
  socketConnection: SocketConnectionModel,
  send: (action: TAllOutgoingActions) => Promise<void>
) {
  const credentials = socketConnection.googleCredentials();
  const livechatId = await findLatestLiveBroadcast(credentials);
  if (!livechatId) {
    return null;
  }

  await socketConnectionsDao.createOrUpdateLiveChatConnection({
    ...socketConnection,
    livechatId,
  });

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
  logger.debug(`Publishing next check for livechatId: ${livechatId}`);
  await publish<IQueueNextPage>(LIVECHAT_MESSAGE_TOPIC, {
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
