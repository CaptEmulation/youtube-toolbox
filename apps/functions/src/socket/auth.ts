import { APIGatewayProxyResult } from "aws-lambda";
import cookie from "cookie";

const nextAuthCookieName = "next-auth.session-token";

export async function requireAuth(
  cookieFromHeader: string
): Promise<[APIGatewayProxyResult, null] | [null, string]> {
  const cookies = cookie.parse(cookieFromHeader);
  const sessionCookie = Object.keys(cookies).find((c) =>
    c.endsWith(nextAuthCookieName)
  );
  if (!sessionCookie) {
    return [
      {
        statusCode: 401,
        body: "Unauthorized",
      },
      null,
    ];
  }
  const sessionFromCookie = cookies[sessionCookie];
  if (!sessionFromCookie) {
    return [
      {
        statusCode: 401,
        body: "Unauthorized",
      },
      null,
    ];
  }
  return [null, sessionFromCookie];
}
