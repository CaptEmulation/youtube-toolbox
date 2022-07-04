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
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    DYNAMODB_ENDPOINT: process.env.DYNAMODB_ENDPOINT,
    DYNAMODB_REGION: process.env.DYNAMODB_REGION,
  }
})

module.exports = nextConfig
