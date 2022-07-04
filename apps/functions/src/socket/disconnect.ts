import { SocketConnectionsDao, getDb } from "@youtube-toolbox/backend";
import { createLogger } from "../utils/logger";

const logger = createLogger({
  name: "youtube-toolbox/socket/disconnect",
});

const db = getDb();
const socketConnectionsDao = new SocketConnectionsDao(db);

export async function disconnect(connectionId: string) {
  try {
    await socketConnectionsDao.delete(connectionId);
  } catch (err) {
    logger.error("Failed to delete socket connection", err);
    return {
      statusCode: 500,
      body: "Internal Server Error",
    };
  }
  return {
    statusCode: 200,
    body: "OK",
  };
}
