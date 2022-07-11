import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import type { youtube_v3 } from "googleapis";

import {
  ILivechatMessages,
  LivechatMessagesModel,
} from "@youtube-toolbox/models";

type TPK = string & { __pk: true };
type TSK = string & { __sk: true };
type LSI1SK = number & { __lsi1sk: true };

interface IDB {
  pk: TPK;
  sk: TSK;
  LSI1SK: LSI1SK;
  expires: number;
  payload: string;
  livechatId: string;
  nextPage: string;
  requestAgainAt: number;
  createdAt: number;
  tipNextPage?: string;
}

interface ITipDB {
  pk: TPK;
  sk: TSK;
  expires: number;
  tipNextPage: string;
}

const LIVECHAT_ID_PREFIX = "LIVECHAT_ID#";
const NEXT_PAGE_PREFIX = "NEXTPAGE#";

function asPk(unknownKey: string): TPK {
  if ([LIVECHAT_ID_PREFIX].some((k) => unknownKey.startsWith(k)) === false) {
    throw new Error(`Invalid PK: ${unknownKey}`);
  }
  return unknownKey as TPK;
}

function asSk(unknownKey: string): TSK {
  if (
    [NEXT_PAGE_PREFIX, LIVECHAT_ID_PREFIX].some((k) =>
      unknownKey.startsWith(k)
    ) === false
  ) {
    throw new Error(`Invalid SK: ${unknownKey}`);
  }
  return unknownKey as TSK;
}

function asLSI1SK(unknownKey: number): LSI1SK {
  return unknownKey as LSI1SK;
}

function livechatIdToPK(livechatId: string): TPK {
  return asPk(LIVECHAT_ID_PREFIX + livechatId);
}

function livechatIdToSK(livechatId: string): TSK {
  return asSk(LIVECHAT_ID_PREFIX + livechatId);
}

function nextPageToSK(nextPage: string): TSK {
  return asSk(NEXT_PAGE_PREFIX + nextPage);
}

function livechatMessageFromDb(item: Record<any, any>) {
  return new LivechatMessagesModel({
    livechatId: item.livechatId,
    nextPage: item.nextPage,
    requestAgainAt: item.requestAgainAt,
    payload: JSON.parse(item.payload),
    createdAt: new Date(item.createdAt),
  });
}
export class LivechatMessagesDao {
  private readonly db: DynamoDBDocumentClient;
  public static TABLE_NAME =
    process.env.TABLE_NAME_LIVECHAT_MESSAGES || "LivechatMessages";

  constructor(db: DynamoDBDocumentClient) {
    this.db = db;
  }

  public async createOrUpdateTipPage(livechatId: string) {
    const now = new Date();
    const pk = livechatIdToPK(livechatId);
    const tipItem: ITipDB = {
      pk,
      sk: livechatIdToSK(livechatId),
      expires: now.getTime() / 1000 + 60 * 60 * 24,
      tipNextPage: "pending",
    };
    await this.db.send(
      new PutCommand({
        TableName: LivechatMessagesDao.TABLE_NAME,
        Item: tipItem,
      })
    );
  }

  public async createOrUpdate(
    livechatId: string,
    nextPage: string,
    requestAgainAt: number,
    payload: any
  ) {
    const now = new Date();
    const pk = livechatIdToPK(livechatId);
    const sk = nextPageToSK(nextPage);
    const lsi1sk = asLSI1SK(now.getTime());
    const item: IDB = {
      pk,
      sk,
      LSI1SK: lsi1sk,
      expires: now.getTime() / 1000 + 60 * 60 * 24,
      payload: JSON.stringify(payload),
      livechatId,
      nextPage,
      requestAgainAt,
      createdAt: now.getTime(),
    };
    const tipItem: ITipDB = {
      pk,
      sk: livechatIdToSK(livechatId),
      expires: now.getTime() / 1000 + 60 * 60 * 24,
      tipNextPage: nextPage,
    };
    await this.db.send(
      new BatchWriteCommand({
        RequestItems: {
          [LivechatMessagesDao.TABLE_NAME]: [
            {
              PutRequest: {
                Item: item,
              },
            },
            {
              PutRequest: {
                Item: tipItem,
              },
            },
          ],
        },
      })
    );
  }

  public async getTipPageOfLivechat(
    livechatId: string
  ): Promise<string | null> {
    const result = await this.db.send(
      new GetCommand({
        TableName: LivechatMessagesDao.TABLE_NAME,
        Key: {
          pk: livechatIdToPK(livechatId),
          sk: livechatIdToSK(livechatId),
        },
      })
    );
    if (!result.Item || !result.Item.tipNextPage) {
      return null;
    }
    return result.Item.tipNextPage;
  }

  public async getAllByLivechatId(
    livechatId: string
  ): Promise<LivechatMessagesModel[]> {
    const result = await this.db.send(
      new ScanCommand({
        TableName: LivechatMessagesDao.TABLE_NAME,
        FilterExpression: "#pk = :pk",
        ExpressionAttributeNames: {
          "#pk": "pk",
        },
        ExpressionAttributeValues: {
          ":pk": livechatIdToPK(livechatId),
        },
      })
    );
    if (result.Items === undefined) {
      return [];
    }
    return result.Items.map(livechatMessageFromDb);
  }

  public async getByLivechatIdAndNextPage(
    livechatId: string,
    nextPage: string
  ): Promise<LivechatMessagesModel | null> {
    const result = await this.db.send(
      new GetCommand({
        TableName: LivechatMessagesDao.TABLE_NAME,
        Key: {
          pk: livechatIdToPK(livechatId),
          sk: nextPageToSK(nextPage),
        },
      })
    );
    if (result.Item === undefined) {
      return null;
    }
    return livechatMessageFromDb(result.Item);
  }

  public async getSinceNextPage(
    livechatId: string,
    nextPage: string
  ): Promise<LivechatMessagesModel[]> {
    const livechat = await this.getByLivechatIdAndNextPage(
      livechatId,
      nextPage
    );
    if (livechat === null) {
      return [];
    }
    const result = await this.db.send(
      new ScanCommand({
        TableName: LivechatMessagesDao.TABLE_NAME,
        IndexName: "LSI1",
        FilterExpression: "#pk = :pk AND #LSI1SK > :createdAt",
        ExpressionAttributeNames: {
          "#pk": "pk",
          "#LSI1SK": "LSI1SK",
        },
        ExpressionAttributeValues: {
          ":pk": livechatIdToPK(livechatId),
          ":createdAt": livechat.createdAt.getTime(),
        },
      })
    );
    if (result.Items === undefined) {
      return [];
    }
    return result.Items.map(livechatMessageFromDb);
  }
}
