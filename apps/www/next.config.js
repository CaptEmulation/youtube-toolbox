const withTM = require('next-transpile-modules')(['@youtube-toolbox/backend', '@youtube-toolbox/models']);

if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
  throw new Error("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set");
}
if (!process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error("GOOGLE_CLIENT_SECRET is not set");
}

/** @type {import('next').NextConfig} */
const nextConfig = withTM({
  reactStrictMode: true,
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXT_PUBLIC_GOOGLE_REDIRECT_URI: process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI,
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    DYNAMODB_ENDPOINT: process.env.DYNAMODB_ENDPOINT,
    DYNAMODB_REGION: process.env.DYNAMODB_REGION,
    SSM_WWW_PARAMS: process.env.SSM_WWW_PARAMS,
  }
})

module.exports = nextConfig
