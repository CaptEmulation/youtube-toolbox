import { IUserSession } from "@youtube-toolbox/models";
import { Credentials } from "google-auth-library";

export function fromUserToCredentials(user: IUserSession): Credentials {
  if (!user.refreshToken) {
    throw new Error("No refresh token found in user");
  }
  if (!user.accessToken) {
    throw new Error("No access token found in user");
  }
  if (!user.tokenType) {
    throw new Error("No token type found in user");
  }
  if (!user.idToken) {
    throw new Error("No id token found in user");
  }
  if (!user.scope) {
    throw new Error("No scope found in user");
  }
  if (!user.expiryDate) {
    throw new Error("No expiry date found in user");
  }

  return {
    refresh_token: user.refreshToken as string,
    expiry_date: user.expiryDate as number,
    access_token: user.accessToken as string,
    token_type: user.tokenType as string,
    id_token: user.idToken as string,
    scope: user.scope as string,
  };
}
