import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import type { youtube_v3 } from "googleapis";

import { ILivechatMessages, LivechatMessages } from "@youtube-toolbox/models";

type TPK = string & { __pk: true };
type TSK = string & { __sk: true };
type LSI1 = number & { __lsi1: true };

interface IDB {
  pk: TPK;
  sk: TSK;
  LSI1: LSI1;
  expires: number;
  payload: string;
  livechatId: string;
  nextPage: string;
  requestAgainAt: number;
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
  if ([NEXT_PAGE_PREFIX].some((k) => unknownKey.startsWith(k)) === false) {
    throw new Error(`Invalid SK: ${unknownKey}`);
  }
  return unknownKey as TSK;
}

function asLSI1(unknownKey: number): LSI1 {
  return unknownKey as LSI1;
}

function livechatIdToPK(livechatId: string): TPK {
  return asPk(LIVECHAT_ID_PREFIX + livechatId);
}

function nextPageToSK(nextPage: string): TSK {
  return asSk(NEXT_PAGE_PREFIX + nextPage);
}
export class LivechatMessagesDao {
  private readonly db: DynamoDBDocumentClient;

  constructor(db: DynamoDBDocumentClient) {
    this.db = db;
  }

  public async getByLivechatId(
    livechatId: string
  ): Promise<youtube_v3.Schema$LiveChatMessage[]> {
    const result = await this.db.send(
      new ScanCommand({
        TableName: process.env.LIVECHAT_MESSAGES_TABLE,
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
    return result.Items.map((item) =>
      new LivechatMessages({
        livechatId,
        nextPage: item.nextPage,
        requestAgainAt: item.requestAgainAt,
        payload: JSON.parse(item.payload),
      }).flattenedMessages()
    ).flat(1);
  }

  public async getByLivechatIdAndNextPage(
    livechatId: string,
    nextPage: string
  ): Promise<LivechatMessages | null> {
    const result = await this.db.send(
      new GetCommand({
        TableName: process.env.LIVECHAT_MESSAGES_TABLE,
        Key: {
          pk: livechatIdToPK(livechatId),
          sk: nextPageToSK(nextPage),
        },
      })
    );
    if (result.Item === undefined) {
      return null;
    }
    return new LivechatMessages({
      livechatId,
      nextPage,
      requestAgainAt: null,
      payload: JSON.parse(result.Item.payload),
    });
  }
}
