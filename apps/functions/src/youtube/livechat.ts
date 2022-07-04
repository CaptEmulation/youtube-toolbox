import { Credentials, OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import {
  googleClientId,
  googleClientSecret,
  googleRedirectUri,
} from "./config";

function googleOAuthCredentials(credentials: Credentials) {
  const auth = new OAuth2Client({
    clientId: googleClientId,
    clientSecret: googleClientSecret,
    redirectUri: googleRedirectUri,
  });
  auth.setCredentials(credentials);
  return auth;
}

export async function findLatestLiveBroadcast(credentials: Credentials) {
  const auth = googleOAuthCredentials(credentials);
  const youtube = google.youtube({ version: "v3", auth });
  const response = await youtube.liveBroadcasts.list({
    part: ["snippet", "contentDetails", "status"],
    broadcastStatus: "active",
    broadcastType: "all",
  });
  const broadcasts = response.data;
  if (!broadcasts.items || broadcasts.items.length === 0) {
    return null;
  }
  // find the most recent livebroadcast
  const liveBroadcast = broadcasts.items.reduce((mostRecent, current) => {
    if (!mostRecent.snippet || !mostRecent.snippet.publishedAt) {
      return current;
    }

    const snippet = current.snippet;
    if (!snippet) {
      return mostRecent;
    }
    const { publishedAt } = snippet;
    if (!publishedAt) {
      return mostRecent;
    }

    if (publishedAt > mostRecent.snippet.publishedAt) {
      return current;
    }
    return mostRecent;
  }, broadcasts.items[0]);

  if (!liveBroadcast.snippet?.liveChatId) {
    return null;
  }
  return liveBroadcast.snippet?.liveChatId;
}

export function fetchLivechat(
  credentials: Credentials,
  liveChatId: string,
  pageToken?: string
) {
  const auth = googleOAuthCredentials(credentials);
  const youtube = google.youtube({ version: "v3", auth });
  return youtube.liveChatMessages.list({
    liveChatId,
    part: ["snippet", "authorDetails"],
    maxResults: 100,
    pageToken,
  });
}
