import type { Credentials } from "google-auth-library";

export interface IUserSession {
  refreshToken: string;
  expiryDate: number;
  accessToken: string;
  tokenType: string;
  idToken: string;
  scope: string;
}

export class UserSessionModel {
  public refreshToken: string;
  public expiryDate: number;
  public accessToken: string;
  public tokenType: string;
  public idToken: string;
  public scope: string;

  constructor(user: IUserSession) {
    this.refreshToken = user.refreshToken;
    this.expiryDate = user.expiryDate;
    this.accessToken = user.accessToken;
    this.tokenType = user.tokenType;
    this.idToken = user.idToken;
    this.scope = user.scope;
  }

  public toJson(): IUserSession {
    return {
      refreshToken: this.refreshToken,
      expiryDate: this.expiryDate,
      accessToken: this.accessToken,
      tokenType: this.tokenType,
      idToken: this.idToken,
      scope: this.scope,
    };
  }

  public static fromJson(json: any): UserSessionModel {
    return new UserSessionModel({
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

  public equals(other: UserSessionModel): boolean {
    return this.toString() === other.toString();
  }

  public toCredentials(): Credentials {
    return {
      refresh_token: this.refreshToken,
      expiry_date: this.expiryDate,
      access_token: this.accessToken,
      token_type: this.tokenType,
      id_token: this.idToken,
      scope: this.scope,
    };
  }
}
