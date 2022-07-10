import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  ILoyaltyPoints,
  TLoyaltyPointsCooldowns,
  TLoyaltyPointTypes,
} from "@youtube-toolbox/models";

type TPK = string & { __pk: true };
type TSK = string & { __sk: true };
type TGSI1PK = string & { __gsi1pk: true };
type TGSI1SK = string & { __gsi1sk: true };

interface IDB {
  pk: TPK;
  sk: TSK;
  GSI1PK?: TGSI1PK;
  GSI1SK?: TGSI1SK;
  type: TLoyaltyPointTypes;
  expires?: number;
  points?: number;
  channelId: string;
  recipientId: string;
}

function toIDB(item: Record<string, any>): IDB {
  const pk = asPk(item.pk);
  const sk = asSk(item.sk);
  const GSI1PK = item.GSI1PK ? asGSI1PK(item.GSI1PK) : undefined;
  const GSI1SK = item.GSI1SK ? asGSI1SK(item.GSI1SK) : undefined;
  const type = item.type as TLoyaltyPointTypes;
  const expires = item.expires ? Number(item.expires) : undefined;
  const points = Number(item.points);
  const channelId = pk.slice(CHANNEL_ID_PREFIX.length);
  const recipientId = sk.slice(POINTS_PREFIX.length);
  return {
    pk,
    sk,
    GSI1PK,
    GSI1SK,
    type,
    expires,
    points,
    channelId,
    recipientId,
  };
}

const CHANNEL_ID_PREFIX = "CHANNEL_ID#";
const POINTS_PREFIX = "POINTS#";

function asPk(unknownKey: string): TPK {
  if ([CHANNEL_ID_PREFIX].some((k) => unknownKey.startsWith(k)) === false) {
    throw new Error(`Invalid PK: ${unknownKey}`);
  }
  return unknownKey as TPK;
}

function asSk(unknownKey: string): TSK {
  if ([POINTS_PREFIX].some((k) => unknownKey.startsWith(k)) === false) {
    throw new Error(`Invalid SK: ${unknownKey}`);
  }
  return unknownKey as TSK;
}

function asGSI1PK(unknownKey: string): TGSI1PK {
  if ([CHANNEL_ID_PREFIX].some((k) => unknownKey.startsWith(k)) === false) {
    throw new Error(`Invalid GSI1PK: ${unknownKey}`);
  }
  return unknownKey as TGSI1PK;
}

function asGSI1SK(unknownKey: string): TGSI1SK {
  if (!Number.isInteger(Number(unknownKey))) {
    throw new Error(`Invalid GSI1SK: ${unknownKey}`);
  }
  return unknownKey as TGSI1SK;
}

function channelIdRecipientIdToPK(channelId: string, recipientId: string): TPK {
  return asPk(`${CHANNEL_ID_PREFIX}${channelId}#${recipientId}`);
}

function pointTypeToSK(pointType: TLoyaltyPointTypes): TSK {
  return asSk(`${POINTS_PREFIX}${pointType}`);
}

function channelIdToGSI1PK(channelId: string): TGSI1PK {
  return asGSI1PK(`${CHANNEL_ID_PREFIX}${channelId}`);
}

function pointsToGSI1SK(points: number): TGSI1SK {
  return asGSI1SK(points.toString());
}

export class LoyaltyPointsDao {
  public static TABLE_NAME =
    process.env.TABLE_NAME_LOYALTY_POINTS || "LoyaltyPoints";
  private readonly db: DynamoDBDocumentClient;

  constructor(db: DynamoDBDocumentClient) {
    this.db = db;
  }

  public async getLoyaltyPointDetails(
    channelId: string,
    recipientId: string
  ): Promise<ILoyaltyPoints | null> {
    const results = await this.db.send(
      new ScanCommand({
        TableName: LoyaltyPointsDao.TABLE_NAME,
        FilterExpression: "pk = :pk",
        ExpressionAttributeValues: {
          ":pk": channelIdRecipientIdToPK(channelId, recipientId),
        },
      })
    );
    if (!results.Items || results.Items.length === 0) {
      return null;
    }

    const items = results.Items.map(toIDB);

    const totalRow = items.find((item) => item.sk === `${POINTS_PREFIX}TOTAL`);
    if (!totalRow) {
      return null;
    }

    const cooldowns: TLoyaltyPointsCooldowns = items.reduce((acc, item) => {
      if (item.type === "TOTAL") {
        return acc;
      }
      acc[item.type] = item.expires;
      return acc;
    }, {} as TLoyaltyPointsCooldowns);

    return {
      channelId,
      recipientId,
      cooldowns,
      points: totalRow.points || 0,
      dirtyTypes: [],
    };
  }

  public async getLoyaltyPointsTotal(
    channelId: string,
    recipientId: string
  ): Promise<number | null> {
    const result = await this.db.send(
      new GetCommand({
        TableName: LoyaltyPointsDao.TABLE_NAME,
        Key: {
          pk: channelIdRecipientIdToPK(channelId, recipientId),
          sk: pointTypeToSK("TOTAL"),
        },
      })
    );
    if (!result.Item) {
      return null;
    }
    return Number(result.Item.points);
  }

  public async createOrUpdateLoyaltyPoints(
    loyaltyPoints: ILoyaltyPoints
  ): Promise<void> {
    const { channelId, recipientId, cooldowns, points, dirtyTypes } =
      loyaltyPoints;

    const items: IDB[] = [];
    items.push({
      pk: channelIdRecipientIdToPK(channelId, recipientId),
      sk: pointTypeToSK("TOTAL"),
      points,
      channelId,
      recipientId,
      type: "TOTAL",
      GSI1PK: channelIdToGSI1PK(channelId),
      GSI1SK: pointsToGSI1SK(points),
    });
    if (dirtyTypes) {
      for (const type of dirtyTypes) {
        items.push({
          pk: channelIdRecipientIdToPK(channelId, recipientId),
          sk: pointTypeToSK(type),
          channelId,
          recipientId,
          type,
          expires: cooldowns[type],
        });
      }
    }

    await this.db.send(
      new BatchWriteCommand({
        RequestItems: {
          [LoyaltyPointsDao.TABLE_NAME]: items.map((item) => ({
            PutRequest: {
              Item: item,
            },
          })),
        },
      })
    );
  }
}
