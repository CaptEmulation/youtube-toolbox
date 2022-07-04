import { Server as SocketServer } from "socket.io";
import { Express } from "express";
import bunyan from "bunyan";
import { Server } from "http";
import cookie from "cookie";

const logger = bunyan.createLogger({ name: "croc-bot/socket" });

export function createSocket(app: Express) {
  const server = new Server(app);
  const io = new SocketServer(server);

  logger.info("Socket server starting");
  io.on("error", (err) => logger.error(err));
  io.on("connect", (socket) => {
    logger.info("connection");
    var cookieFromHeader = socket.handshake.headers.cookie;
    var cookies = cookieFromHeader ? cookie.parse(cookieFromHeader) : {};
    socket.on("init", ({ liveChatId }: { liveChatId: string }) => {
      logger.info("joining", liveChatId);
      socket.join(liveChatId);
    });
  });
  return {
    server,
    io,
    broadcast(channel: string) {
      logger.info("broadcast", channel);
      return io.sockets.to(channel);
    },
  };
}
