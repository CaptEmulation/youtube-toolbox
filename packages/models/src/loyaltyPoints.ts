enum ELoyaltyPointTypes {
  TOTAL = "TOTAL",
  CHAT = "CHAT",
  MEMBERSHIP = "MEMBERSHIP",
  GIFTED_MEMBERSHIP = "GIFTED_MEMBERSHIP",
  SUPERCHAT = "SUPERCHAT",
}

export const LOYALTY_POINT_TYPES = [
  ELoyaltyPointTypes.TOTAL,
  ELoyaltyPointTypes.CHAT,
  ELoyaltyPointTypes.MEMBERSHIP,
  ELoyaltyPointTypes.GIFTED_MEMBERSHIP,
  ELoyaltyPointTypes.SUPERCHAT,
] as const;

export type TLoyaltyPointTypes = keyof typeof ELoyaltyPointTypes;
export type TLoyaltyPointTypesNoTotal = Exclude<TLoyaltyPointTypes, "TOTAL">;
export type TLoyaltyPointsCooldowns = Partial<
  Record<TLoyaltyPointTypesNoTotal, number>
>;

export interface ILoyaltyPoints {
  channelId: string;
  recipientId: string;
  points: number;
  cooldowns: TLoyaltyPointsCooldowns;
  dirtyTypes?: TLoyaltyPointTypesNoTotal[];
  deltaPoints?: number;
}

const POINT_INCREMENTOR = 10;
const ONE_MINUTE_MS = 60 * 1000;
const PointCooldownMap: Record<
  TLoyaltyPointTypesNoTotal,
  { cooldown: number; multiplier: number }
> = {
  [ELoyaltyPointTypes.CHAT]: { cooldown: ONE_MINUTE_MS, multiplier: 1 },
  [ELoyaltyPointTypes.MEMBERSHIP]: { cooldown: ONE_MINUTE_MS, multiplier: 10 },
  [ELoyaltyPointTypes.GIFTED_MEMBERSHIP]: {
    cooldown: ONE_MINUTE_MS,
    multiplier: 20,
  },
  [ELoyaltyPointTypes.SUPERCHAT]: { cooldown: ONE_MINUTE_MS, multiplier: 5 },
};

export class LoyaltyPointsModel {
  public readonly channelId: string;
  public readonly recipientId: string;
  public readonly points: number;
  public readonly cooldowns: TLoyaltyPointsCooldowns;
  public readonly dirtyTypes?: TLoyaltyPointTypesNoTotal[] = [];
  public readonly deltaPoints?: number;

  constructor(lp: ILoyaltyPoints) {
    this.channelId = lp.channelId;
    this.recipientId = lp.recipientId;
    this.points = lp.points;
    this.cooldowns = lp.cooldowns;
    this.dirtyTypes = lp.dirtyTypes;
    this.deltaPoints = lp.deltaPoints;
  }

  incrementPoints(type: TLoyaltyPointTypesNoTotal): LoyaltyPointsModel {
    const cooldownExpiresAt = this.cooldowns[type];
    if (cooldownExpiresAt && cooldownExpiresAt > Date.now()) {
      return this;
    }
    return new LoyaltyPointsModel({
      channelId: this.channelId,
      recipientId: this.recipientId,
      points:
        this.points + POINT_INCREMENTOR * PointCooldownMap[type].multiplier,
      cooldowns: {
        ...this.cooldowns,
        [type]: Date.now() + PointCooldownMap[type].cooldown,
      },
      dirtyTypes: [...(this.dirtyTypes ? this.dirtyTypes : []), type],
    });
  }
}
