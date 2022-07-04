import { Socket } from "socket.io";
import { generateLiveMessages } from "../incomingGoogleLiveMessages";
import bunyan from "bunyan";

const logger = bunyan.createLogger({ name: "croc-bot/socket/initialize" });

export function init(socket: Socket) {
  socket.on("init", ({ liveChatId }: { liveChatId: string }) => {
    logger.info("joining", liveChatId);
    socket.join(liveChatId);
  });
}
