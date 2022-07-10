import { SocketConnectionsDao } from "@youtube-toolbox/backend";
import {
  ISocketConnection,
  SocketConnectionModel,
  TAllIncomingActions,
  TAllOutgoingActions,
} from "@youtube-toolbox/models";
import { ApiGatewayManagementApi } from "@aws-sdk/client-apigatewaymanagementapi";
import { openLiveChat, requestMoreMessages } from "./commands/openLiveChat";
import { createLogger } from "../utils/logger";

const logger = createLogger({
  name: "youtube-toolbox/socket/handler",
});

export async function sendAction(
  apigwManagementApi: ApiGatewayManagementApi,
  connectionId: string,
  action: TAllOutgoingActions
) {
  await apigwManagementApi.postToConnection({
    ConnectionId: connectionId,
    Data: Buffer.from(JSON.stringify(action)),
  });
}

export async function handleIncomingMessage(
  action: TAllIncomingActions,
  socketConnection: SocketConnectionModel,
  send: (data: TAllOutgoingActions) => Promise<void>
) {
  switch (action.type) {
    case "openLivechat": {
      logger.debug("Opening livechat");
      await openLiveChat(socketConnection, send);
      break;
    }
    case "requestMoreMessages": {
      const livechatId = action.payload.livechatId;
      const nextPage = action.payload.nextPage;
      await requestMoreMessages({
        livechatId,
        nextPage,
        credentials: socketConnection.googleCredentials(),
        send,
      });
      break;
    }
    case "ping": {
      await send({
        type: "pong",
      });
      break;
    }
    default: {
      throw new Error(`Unknown action: ${JSON.stringify(action)}`);
    }
  }
}
