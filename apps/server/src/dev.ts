import WebSocket from "ws";
import httpProxy from "http-proxy";
import http from "http";
import { v4 as uuid } from "uuid";
import {
  requireAuth,
  connect,
  message,
  disconnect,
} from "@youtube-toolbox/functions";
import bunyan from "bunyan";

const logger = bunyan.createLogger({
  name: "youtube-toolbox/server/dev",
});

const wwwProxy = httpProxy.createProxyServer({
  target: {
    host: "localhost",
    port: 3000,
  },
});

const wsServerProxy = httpProxy.createProxyServer({
  target: {
    host: "localhost",
    port: 5000,
  },
});

const wss = new WebSocket.Server({ port: 5000, path: "/ws" });

var server = http.createServer(function (req, res) {
  wwwProxy.web(req, res);
});

server.on("upgrade", (req, socket, head) => {
  if (req.url?.startsWith("/ws")) {
    wsServerProxy.ws(req, socket, head);
  } else if (req.url?.startsWith("/_next")) {
    wwwProxy.ws(req, socket, head);
  }
});

wss.on("connection", async (ws, req) => {
  const cookieString = req.headers.cookie ?? "";
  const [sessionErr, session] = await requireAuth(cookieString);
  if (sessionErr) {
    ws.close(3000, "Unauthorized");
    return;
  }
  const connectionId = uuid();
  const messageEndpoint = `/ws/${connectionId}`;

  async function send(data: any) {
    ws.send(JSON.stringify(data));
  }

  ws.on("message", async (body) => {
    await message(connectionId, messageEndpoint, body.toString(), send);
  });

  try {
    const response = await connect(
      connectionId,
      messageEndpoint,
      session,
      send
    );
    if (response.statusCode !== 200) {
      ws.close(1011, response.body);
      return;
    }
  } catch (err) {
    logger.error(err);
    ws.close(1011, "Internal Server Error");
    return;
  }

  ws.on("close", async () => {
    await disconnect(connectionId);
  });

  ws.on("error", async (err) => {
    await disconnect(connectionId);
  });
});

server.listen(8080, () => {
  logger.info("Server started");
});

server.on("error", (err) => {
  logger.error("Server error", err);
});
