import type { Credentials } from "google-auth-library";
import type { youtube_v3 } from "googleapis";
export interface ISocketConnection {
  connectionId: string;
  messageEndpoint: string;
  livechatId?: string;
  nextPage?: string;
  refreshToken?: string;
  expiryDate?: number;
  accessToken?: string;
  tokenType?: string;
  idToken?: string;
  scope?: string;
}

export class SocketConnectionModel {
  public connectionId: string;
  public messageEndpoint: string;
  public nextPage?: string;
  public livechatId?: string;
  public refreshToken?: string;
  public expiryDate?: number;
  public accessToken?: string;
  public tokenType?: string;
  public idToken?: string;
  public scope?: string;

  constructor(socket: ISocketConnection) {
    this.connectionId = socket.connectionId;
    this.messageEndpoint = socket.messageEndpoint;
    this.nextPage = socket.nextPage;
    this.livechatId = socket.livechatId;
    this.refreshToken = socket.refreshToken;
    this.expiryDate = socket.expiryDate;
    this.accessToken = socket.accessToken;
    this.tokenType = socket.tokenType;
    this.idToken = socket.idToken;
    this.scope = socket.scope;
  }

  public toJson(): ISocketConnection {
    return {
      connectionId: this.connectionId,
      messageEndpoint: this.messageEndpoint,
      nextPage: this.nextPage,
      livechatId: this.livechatId,
      refreshToken: this.refreshToken,
      expiryDate: this.expiryDate,
      accessToken: this.accessToken,
      tokenType: this.tokenType,
      idToken: this.idToken,
      scope: this.scope,
    };
  }

  public static fromJson(json: any): SocketConnectionModel {
    return new SocketConnectionModel({
      connectionId: json.connectionId,
      messageEndpoint: json.messageEndpoint,
      nextPage: json.nextPage,
      livechatId: json.livechatId,
      refreshToken: json.refreshToken,
      expiryDate: json.expiryDate,
      accessToken: json.accessToken,
      tokenType: json.tokenType,
      idToken: json.idToken,
      scope: json.scope,
    });
  }

  public toString(): string {
    return JSON.stringify(this.toJson());
  }

  public equals(other: SocketConnectionModel): boolean {
    return (
      this.connectionId === other.connectionId &&
      this.messageEndpoint === other.messageEndpoint &&
      this.nextPage === other.nextPage &&
      this.livechatId === other.livechatId &&
      this.refreshToken === other.refreshToken &&
      this.expiryDate === other.expiryDate &&
      this.accessToken === other.accessToken &&
      this.tokenType === other.tokenType &&
      this.idToken === other.idToken &&
      this.scope === other.scope
    );
  }

  public clone(): SocketConnectionModel {
    return new SocketConnectionModel(this.toJson());
  }

  public static fromString(str: string): SocketConnectionModel {
    return SocketConnectionModel.fromJson(JSON.parse(str));
  }

  public static fromGoogleCredentials({
    connectionId,
    messageEndpoint,
    credentials,
    livechatId,
    nextPage,
  }: {
    credentials: Credentials;
    connectionId: string;
    messageEndpoint: string;
    livechatId?: string;
    nextPage?: string;
  }): SocketConnectionModel {
    return new SocketConnectionModel({
      connectionId,
      messageEndpoint,
      livechatId,
      nextPage,
      refreshToken: credentials.refresh_token ?? undefined,
      expiryDate: credentials.expiry_date ?? undefined,
      accessToken: credentials.access_token ?? undefined,
      tokenType: credentials.token_type ?? undefined,
      idToken: credentials.id_token ?? undefined,
      scope: credentials.scope ?? undefined,
    });
  }

  googleCredentials(): Credentials {
    return {
      access_token: this.accessToken,
      id_token: this.idToken,
      refresh_token: this.refreshToken,
      scope: this.scope,
      token_type: this.tokenType,
      expiry_date: this.expiryDate,
    };
  }
}

export interface ISocketMessagePayload<Action extends string, Payload> {
  type: Action;
  payload: Payload;
}

export interface ISocketMessage<Action extends string> {
  type: Action;
}

export type TInitAction = ISocketMessage<"openLivechat">;
export type TPingAction = ISocketMessage<"ping">;
export type TRequestMoreMessages = ISocketMessagePayload<
  "requestMoreMessages",
  {
    livechatId: string;
    nextPage?: string;
  }
>;
export type TStopAction = ISocketMessage<"stop">;
export type TStartAction = ISocketMessage<"start">;

export type TAllIncomingActions =
  | TInitAction
  | TPingAction
  | TRequestMoreMessages
  | TStopAction
  | TStartAction;

export type TOkAction = ISocketMessage<"ok">;
export type TConnectedAction = ISocketMessage<"connected">;
export type TLivechatOpenAction = ISocketMessagePayload<"livechatOpen", string>;
export type TLivechatNewMessagesAction = ISocketMessagePayload<
  "livechatNewMessages",
  youtube_v3.Schema$LiveChatMessage[]
> & { nextPage?: string | null };
export type TErrorAction = ISocketMessagePayload<"error", { message: string }>;
export type TPongAction = ISocketMessage<"pong">;

export type TAllOutgoingActions =
  | TOkAction
  | TConnectedAction
  | TLivechatOpenAction
  | TLivechatNewMessagesAction
  | TErrorAction
  | TStopAction
  | TPongAction;

export type TAllActions = TAllIncomingActions | TAllOutgoingActions;
