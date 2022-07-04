export type TLambdaName = "google-sign-in";

export function baseLambdaUrl(lambdaName: TLambdaName): URL {
  if (!process.env.LAMBDA_GOOGLE_SIGN_IN_BASEURL) {
    throw new Error("Env var LAMBDA_GOOGLE_SIGN_IN_BASEURL is not defined");
  }

  return new URL(process.env.LAMBDA_GOOGLE_SIGN_IN_BASEURL);
}
