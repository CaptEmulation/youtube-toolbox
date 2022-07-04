import { getDb, SocketConnectionsDao } from "@youtube-toolbox/backend";
import {
  SocketConnectionModel,
  TAllOutgoingActions,
} from "@youtube-toolbox/models";
import bunyan from "bunyan";
import { fetchLivechat, findLatestLiveBroadcast } from "../../youtube/livechat";

const logger = bunyan.createLogger({
  name: "youtube-toolbox/socket/commands/openLiveChat",
});

const db = getDb();
const socketConnectionsDao = new SocketConnectionsDao(db);

export async function openLiveChat(
  socketConnection: SocketConnectionModel,
  send: (action: TAllOutgoingActions) => Promise<void>
) {
  const credentials = socketConnection.googleCredentials();
  const livechatId = await findLatestLiveBroadcast(credentials);
  if (!livechatId) {
    return null;
  }
  await send({
    type: "livechatOpen",
    payload: { livechatId },
  });
  await socketConnectionsDao.createOrUpdateLiveChatConnection({
    ...socketConnection,
    livechatId,
  });
  const liveChat = await fetchLivechat(credentials, livechatId);
  logger.info({
    liveChat,
  });
}
