import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import type { ISocketConnection } from "@youtube-toolbox/models";

type TPK = string & { __pk: true };
type TSK = string & { __sk: true };
type TGSI1PK = string & { __gsi1pk: true };
type TGSI1SK = string & { __gsi1sk: true };

interface ITokenAttributes {
  ConnectionId: string;
  MessageEndpoint: string;
  LiveChatId?: string;
  NextPage?: string;
  // Consider replacing everything below with just a "session"
  RefreshToken?: string;
  ExpiryDate?: number;
  AccessToken?: string;
  TokenType?: string;
  IdToken?: string;
  Scope?: string;
}
interface IDB {
  pk: TPK;
  sk: TSK;
  GSI1PK: TGSI1PK;
  GSI1SK: TGSI1SK;
  expires: number;
  MessageEndpoint: string;
}

type TDBSocketConnection = IDB & ITokenAttributes;

const CONNECTION_ID_PREFIX = "CONNECTION_ID#";
const LIVECHAT_ID_PREFIX = "LIVECHAT_ID#";
const MESSAGE_ENDPOINT_PREFIX = "MESSAGE_ENDPOINT#";

function asPk(unknownKey: string): TPK {
  if ([CONNECTION_ID_PREFIX].some((k) => unknownKey.startsWith(k)) === false) {
    throw new Error(`Invalid PK: ${unknownKey}`);
  }
  return unknownKey as TPK;
}

function asSk(unknownKey: string): TSK {
  if (
    [CONNECTION_ID_PREFIX, LIVECHAT_ID_PREFIX, MESSAGE_ENDPOINT_PREFIX].some(
      (k) => unknownKey.startsWith(k)
    ) === false
  ) {
    throw new Error(`Invalid SK: ${unknownKey}`);
  }
  return unknownKey as TSK;
}

function asGSI1PK(unknownKey: string): TGSI1PK {
  if (
    [MESSAGE_ENDPOINT_PREFIX, LIVECHAT_ID_PREFIX].some((k) =>
      unknownKey.startsWith(k)
    ) === false
  ) {
    throw new Error(`Invalid GSI1PK: ${unknownKey}`);
  }
  return unknownKey as TGSI1PK;
}

function asGSI1SK(unknownKey: string): TGSI1SK {
  if ([CONNECTION_ID_PREFIX].some((k) => unknownKey.startsWith(k)) === false) {
    throw new Error(`Invalid GSI1SK: ${unknownKey}`);
  }
  return unknownKey as TGSI1SK;
}

function connectionKeyToId(key: TPK | TGSI1SK) {
  if (!key.startsWith(CONNECTION_ID_PREFIX)) {
    throw new Error(`Invalid connection_id key ${key}`);
  }
  return key.split(CONNECTION_ID_PREFIX)[1];
}

function connectionIdToKey(id: string) {
  return `${CONNECTION_ID_PREFIX}${id}`;
}

function livechatKeyToId(key: TSK | TGSI1PK) {
  if (!key.startsWith(LIVECHAT_ID_PREFIX)) {
    throw new Error(`Invalid livechat_id key ${key}`);
  }
  return key.split(LIVECHAT_ID_PREFIX)[1];
}

function livechatNextPageKeyToId(key: TSK | TGSI1PK) {
  if (!key.startsWith(LIVECHAT_ID_PREFIX)) {
    throw new Error(`Invalid livechat_id key ${key}`);
  }
  const idPortion = key.split(LIVECHAT_ID_PREFIX)[1];
  const components = idPortion.split("#");
  if (components.length !== 2) {
    throw new Error(`Invalid livechat_id key ${key}`);
  }
  return {
    livechatId: components[0],
    nextPage: components[1],
  };
}

function messageEndpointKeyToId(key: TSK | TGSI1PK) {
  if (!key.startsWith(MESSAGE_ENDPOINT_PREFIX)) {
    throw new Error(`Invalid message_endpoint key ${key}`);
  }
  return key.split(MESSAGE_ENDPOINT_PREFIX)[1];
}

function messageEndpointIdToKey(id: string) {
  return `${MESSAGE_ENDPOINT_PREFIX}${id}`;
}

function expires() {
  // short 6 hr expiry
  return {
    expires: Math.floor(Date.now() / 1000) + 60 * 60 * 6,
  };
}

function livechatIdToKey(id?: string) {
  return id ? `${LIVECHAT_ID_PREFIX}${id}` : `${LIVECHAT_ID_PREFIX}unknown`;
}

function liveChatIdNextPageKey(livechatId: string, nextPage: string) {
  return `${LIVECHAT_ID_PREFIX}${livechatId}#${nextPage}`;
}

function tokenDetailsToDb(user: ISocketConnection): ITokenAttributes {
  return {
    ConnectionId: user.connectionId,
    MessageEndpoint: user.messageEndpoint,
    NextPage: user.nextPage,
    LiveChatId: user.livechatId,
    RefreshToken: user.refreshToken,
    ExpiryDate: user.expiryDate,
    AccessToken: user.accessToken,
    TokenType: user.tokenType,
    IdToken: user.idToken,
    Scope: user.scope,
  };
}

function toConnectionIndexedDb(
  connectionId: string,
  messageEndpoint: string
): IDB {
  return {
    pk: asPk(connectionIdToKey(connectionId)),
    sk: asSk(messageEndpointIdToKey(messageEndpoint)),
    GSI1PK: asGSI1PK(messageEndpointIdToKey(messageEndpoint)),
    GSI1SK: asGSI1SK(connectionIdToKey(connectionId)),
    MessageEndpoint: messageEndpoint,
    ...expires(),
  };
}

function toLivechatIndexedDb(
  connectionId: string,
  livechatId: string,
  messageEndpoint: string
): IDB {
  return {
    pk: asPk(connectionIdToKey(connectionId)),
    sk: asSk(livechatIdToKey(livechatId)),
    GSI1PK: asGSI1PK(livechatIdToKey(livechatId)),
    GSI1SK: asGSI1SK(connectionIdToKey(connectionId)),
    MessageEndpoint: messageEndpoint,
    ...expires(),
  };
}

function toLivechatNextPageIndexedDb(
  connectionId: string,
  livechatId: string,
  nextPage: string,
  messageEndpoint: string
): IDB {
  return {
    pk: asPk(connectionIdToKey(connectionId)),
    sk: asSk(liveChatIdNextPageKey(livechatId, nextPage)),
    GSI1PK: asGSI1PK(liveChatIdNextPageKey(livechatId, nextPage)),
    GSI1SK: asGSI1SK(connectionIdToKey(connectionId)),
    MessageEndpoint: messageEndpoint,
    ...expires(),
  };
}

function dbUserToModel(
  socketConnectionRecord: Record<string, any>
): ISocketConnection {
  const socketConnection = socketConnectionRecord as TDBSocketConnection;
  return {
    connectionId: connectionKeyToId(socketConnection.pk),
    messageEndpoint: socketConnection.MessageEndpoint,
    nextPage: socketConnection.NextPage,
    livechatId: socketConnection.LiveChatId,
    accessToken: socketConnection.AccessToken,
    refreshToken: socketConnection.RefreshToken,
    expiryDate: socketConnection.ExpiryDate,
    tokenType: socketConnection.TokenType,
    idToken: socketConnection.IdToken,
    scope: socketConnection.Scope,
  };
}

export class SocketConnectionsDao {
  public static TABLE_NAME =
    process.env.TABLE_NAME_SOCKET_CONNECTIONS || "SocketConnections";
  private db: DynamoDBDocumentClient;

  constructor(db: DynamoDBDocumentClient) {
    this.db = db;
  }

  public async createOrUpdateSocketConnection(
    user: ISocketConnection
  ): Promise<void> {
    await this.db.send(
      new PutCommand({
        TableName: SocketConnectionsDao.TABLE_NAME,
        Item: {
          ...toConnectionIndexedDb(user.connectionId, user.messageEndpoint),
          ...tokenDetailsToDb(user),
        },
      })
    );
  }

  public async createNextPageLiveChatConnection(
    user: Omit<ISocketConnection, "livechatId"> & {
      livechatId: string;
      nextPage: string;
    }
  ): Promise<void> {
    await this.db.send(
      new PutCommand({
        TableName: SocketConnectionsDao.TABLE_NAME,
        Item: {
          ...toLivechatNextPageIndexedDb(
            user.connectionId,
            user.livechatId,
            user.nextPage,
            user.messageEndpoint
          ),
          ...tokenDetailsToDb(user),
        },
      })
    );
  }
  public async createOrUpdateLiveChatConnection(
    user: Omit<ISocketConnection, "livechatId"> & { livechatId: string }
  ): Promise<void> {
    if (user.nextPage) {
      await this.db.send(
        new BatchWriteCommand({
          RequestItems: {
            [SocketConnectionsDao.TABLE_NAME]: [
              {
                PutRequest: {
                  Item: {
                    ...toLivechatIndexedDb(
                      user.connectionId,
                      user.livechatId,
                      user.messageEndpoint
                    ),
                    ...tokenDetailsToDb(user),
                  },
                },
              },
              {
                PutRequest: {
                  Item: {
                    ...toLivechatNextPageIndexedDb(
                      user.connectionId,
                      user.livechatId,
                      user.nextPage,
                      user.messageEndpoint
                    ),
                    ...tokenDetailsToDb(user),
                  },
                },
              },
            ],
          },
        })
      );
    } else {
      await this.db.send(
        new PutCommand({
          TableName: SocketConnectionsDao.TABLE_NAME,
          Item: {
            ...toLivechatIndexedDb(
              user.connectionId,
              user.livechatId,
              user.messageEndpoint
            ),
            ...tokenDetailsToDb(user),
          },
        })
      );
    }
  }

  public async getByConnectionId(
    connectionId: string,
    messageEndpoint: string
  ): Promise<ISocketConnection | null> {
    const userRecord = await this.db.send(
      new GetCommand({
        TableName: SocketConnectionsDao.TABLE_NAME,
        Key: {
          pk: connectionIdToKey(connectionId),
          sk: messageEndpointIdToKey(messageEndpoint),
        },
      })
    );
    if (!userRecord.Item) {
      return null;
    }
    return dbUserToModel(userRecord.Item);
  }

  public async getByMessageEndpoint(
    messageEndpoint: string
  ): Promise<ISocketConnection[]> {
    const userRecord = await this.db.send(
      new ScanCommand({
        TableName: SocketConnectionsDao.TABLE_NAME,
        IndexName: "GSI1",
        FilterExpression: "#gsi1pk = :gsi1pk",
        ExpressionAttributeNames: {
          "#gsi1pk": "GSI1PK",
        },
        ExpressionAttributeValues: {
          ":gsi1pk": messageEndpointIdToKey(messageEndpoint),
        },
      })
    );
    if (!userRecord.Items) {
      return [];
    }
    return userRecord.Items.map(dbUserToModel);
  }

  public async getByLiveChatId(
    livechatId: string
  ): Promise<ISocketConnection[]> {
    const userRecord = await this.db.send(
      new ScanCommand({
        TableName: SocketConnectionsDao.TABLE_NAME,
        IndexName: "GSI1",
        FilterExpression: "#gsi1pk = :gsi1pk",
        ExpressionAttributeNames: {
          "#gsi1pk": "GSI1PK",
        },
        ExpressionAttributeValues: {
          ":gsi1pk": livechatIdToKey(livechatId),
        },
      })
    );
    if (!userRecord.Items) {
      return [];
    }
    return userRecord.Items.map(dbUserToModel);
  }

  public async getByLiveChatIdNextPage(livechatId: string, nextPage: string) {
    const userRecord = await this.db.send(
      new ScanCommand({
        TableName: SocketConnectionsDao.TABLE_NAME,
        IndexName: "GSI1",
        FilterExpression: "#gsi1pk = :gsi1pk",
        ExpressionAttributeNames: {
          "#gsi1pk": "GSI1PK",
        },
        ExpressionAttributeValues: {
          ":gsi1pk": liveChatIdNextPageKey(livechatId, nextPage),
        },
      })
    );
    if (!userRecord.Items) {
      return [];
    }
    return userRecord.Items.map(dbUserToModel);
  }

  public async delete(connectionId: string): Promise<void> {
    const results = await this.db.send(
      new ScanCommand({
        TableName: SocketConnectionsDao.TABLE_NAME,
        FilterExpression: "#pk = :pk",
        ExpressionAttributeNames: {
          "#pk": "pk",
        },
        ExpressionAttributeValues: {
          ":pk": connectionIdToKey(connectionId),
        },
      })
    );
    if (!results.Items || results.Items.length < 1) {
      return;
    }

    await this.db.send(
      new BatchWriteCommand({
        RequestItems: {
          [SocketConnectionsDao.TABLE_NAME]: results.Items.map((item) => ({
            DeleteRequest: {
              Key: {
                pk: item.pk,
                sk: item.sk,
              },
            },
          })),
        },
      })
    );
  }
}
