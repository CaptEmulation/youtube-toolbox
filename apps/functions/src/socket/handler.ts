import { SocketConnectionsDao } from "@youtube-toolbox/backend";
import {
  ISocketConnection,
  SocketConnectionModel,
  TAllIncomingActions,
  TAllOutgoingActions,
} from "@youtube-toolbox/models";
import { ApiGatewayManagementApi } from "aws-sdk";
import { openLiveChat } from "./commands/openLiveChat";

export async function sendAction(
  apigwManagementApi: ApiGatewayManagementApi,
  connectionId: string,
  action: TAllOutgoingActions
) {
  await apigwManagementApi
    .postToConnection({
      ConnectionId: connectionId,
      Data: JSON.stringify(action),
    })
    .promise();
}

export async function handleIncomingMessage(
  action: TAllIncomingActions,
  socketConnection: SocketConnectionModel,
  send: (data: TAllOutgoingActions) => Promise<void>
) {
  switch (action.type) {
    case "openLivechat": {
      await openLiveChat(socketConnection, send);
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
