import {
  DynamoDBDocumentClient,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { IUserSession } from "@youtube-toolbox/models";

type TPK = string & { __pk: true };
type TSK = string & { __sk: true };
type TGSI1PK = string & { __gsi1pk: true };
type TGSI1SK = string & { __gsi1sk: true };

interface IDB {
  pk: TPK;
  sk: TSK;
  GSI1PK: TGSI1PK;
  GSI1SK: TGSI1SK;
}

interface IUserAttributes {
  refresh_token: string;
  expires_at: number;
  access_token: string;
  token_type: string;
  id_token: string;
  scope: string;
}
type TUser = IUserAttributes & IDB;

interface ISessionAttributes {
  userId: string;
}
type TSession = ISessionAttributes & IDB;

function asPk(unknownKey: string): TPK {
  if ([USER_ID_PREFIX].some((k) => unknownKey.startsWith(k)) === false) {
    throw new Error(`Invalid PK: ${unknownKey}`);
  }
  return unknownKey as TPK;
}

function asSk(unknownKey: string): TSK {
  if ([USER_ID_PREFIX].some((k) => unknownKey.startsWith(k)) === false) {
    throw new Error(`Invalid SK: ${unknownKey}`);
  }
  return unknownKey as TSK;
}

function asGSI1PK(unknownKey: string): TGSI1PK {
  if (
    [USER_ID_PREFIX, SESSION_ID_PREFIX].some((k) =>
      unknownKey.startsWith(k)
    ) === false
  ) {
    throw new Error(`Invalid GSI1PK: ${unknownKey}`);
  }
  return unknownKey as TGSI1PK;
}

function asGSI1SK(unknownKey: string): TGSI1SK {
  if (
    [USER_ID_PREFIX, SESSION_ID_PREFIX].some((k) =>
      unknownKey.startsWith(k)
    ) === false
  ) {
    throw new Error(`Invalid GSI1SK: ${unknownKey}`);
  }
  return unknownKey as TGSI1SK;
}

const USER_ID_PREFIX = "USER#";
const SESSION_ID_PREFIX = "SESSION#";

function userIdToPK(userId: string): TPK {
  return asPk(`${USER_ID_PREFIX}${userId}`);
}

function userIdToSK(userId: string): TSK {
  return asSk(`${USER_ID_PREFIX}${userId}`);
}

function sessionIdToGSI1PK(sessionId: string): TGSI1PK {
  return asGSI1PK(`${SESSION_ID_PREFIX}${sessionId}`);
}

function sessionIdToGSI1SK(sessionId: string): TGSI1SK {
  return asGSI1SK(`${SESSION_ID_PREFIX}${sessionId}`);
}

export class UserSessionDao {
  public static TABLE_NAME = process.env.TABLE_NAME_SESSION || "Sessions";
  private db: DynamoDBDocumentClient;

  constructor(db: DynamoDBDocumentClient) {
    this.db = db;
  }

  public async getUserSession(
    sessionToken: string
  ): Promise<[ISessionAttributes, IUserSession] | [null, null]> {
    const response = await this.db.send(
      new QueryCommand({
        TableName: UserSessionDao.TABLE_NAME,
        IndexName: "GSI1",
        KeyConditionExpression: "#gsi1pk = :gsi1pk AND #gsi1sk = :gsi1sk",
        ExpressionAttributeNames: {
          "#gsi1pk": "GSI1PK",
          "#gsi1sk": "GSI1SK",
        },
        ExpressionAttributeValues: {
          ":gsi1pk": sessionIdToGSI1PK(sessionToken),
          ":gsi1sk": sessionIdToGSI1SK(sessionToken),
        },
      })
    );
    if (!response.Items?.length) {
      return [null, null];
    }
    const session = response.Items[0] as ISessionAttributes;
    const user = await this.db.send(
      new ScanCommand({
        TableName: UserSessionDao.TABLE_NAME,
        FilterExpression: "#pk = :pk AND begins_with(#sk, :sk)",
        ExpressionAttributeNames: {
          "#pk": "pk",
          "#sk": "sk",
        },
        ExpressionAttributeValues: {
          ":pk": userIdToPK(session.userId),
          ":sk": "ACCOUNT#google#",
        },
      })
    );
    if (!user.Items?.length) {
      return [null, null];
    }
    const userTokenDetails = user.Items[0] as IUserAttributes;
    return [
      session,
      {
        refreshToken: userTokenDetails.refresh_token,
        expiryDate: userTokenDetails.expires_at,
        accessToken: userTokenDetails.access_token,
        tokenType: userTokenDetails.token_type,
        idToken: userTokenDetails.id_token,
        scope: userTokenDetails.scope,
      },
    ];
  }
}
