export enum ELoyaltyPointTypes {
  TOTAL = "TOTAL",
  CHAT = "CHAT",
  MEMBERSHIP = "MEMBERSHIP",
  GIFTED_MEMBERSHIP = "GIFTED_MEMBERSHIP",
  SUPERCHAT = "SUPERCHAT",
}

export type TLoyaltyPointTypes = keyof typeof ELoyaltyPointTypes;
export type TLoyaltyPointsCooldowns = Partial<
  Record<TLoyaltyPointTypes, number>
>;

export interface ILoyaltyPoints {
  channelId: string;
  recipientId: string;
  points: number;
  cooldowns: TLoyaltyPointsCooldowns;
}

export class LoyaltyPoints {
  public readonly channelId: string;
  public readonly recipientId: string;
  public readonly points: number;
  public readonly cooldowns: TLoyaltyPointsCooldowns;

  constructor(lp: ILoyaltyPoints) {
    this.channelId = lp.channelId;
    this.recipientId = lp.recipientId;
    this.points = lp.points;
    this.cooldowns = lp.cooldowns;
  }
}
