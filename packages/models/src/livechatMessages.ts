import { youtube_v3 } from "googleapis";

export interface ILivechatMessages {
  livechatId: string;
  nextPage?: string | null;
  requestAgainAt?: number | null;
  payload: youtube_v3.Schema$LiveChatMessageListResponse;
  createdAt: Date;
}

export class LivechatMessagesModel {
  public readonly livechatId: string;
  public readonly nextPage?: string | null;
  public readonly requestAgainAt?: number | null;
  public readonly payload: youtube_v3.Schema$LiveChatMessageListResponse;
  public readonly createdAt: Date;

  constructor(livechatMessages: ILivechatMessages) {
    this.livechatId = livechatMessages.livechatId;
    this.nextPage = livechatMessages.nextPage;
    this.requestAgainAt = livechatMessages.requestAgainAt;
    this.payload = livechatMessages.payload;
    this.createdAt = livechatMessages.createdAt;
  }

  public toJson(): ILivechatMessages {
    return {
      livechatId: this.livechatId,
      nextPage: this.nextPage,
      requestAgainAt: this.requestAgainAt,
      payload: this.payload,
      createdAt: this.createdAt,
    };
  }

  public static fromJson(json: any): LivechatMessagesModel {
    return new LivechatMessagesModel({
      livechatId: json.livechatId,
      nextPage: json.nextPage,
      requestAgainAt: json.requestAgainAt,
      createdAt: new Date(json.createdAt),
      payload:
        typeof json.payload === "string"
          ? JSON.parse(json.payload)
          : json.payload,
    });
  }

  public flattenedMessages() {
    return this.payload.items ?? [];
  }
}
