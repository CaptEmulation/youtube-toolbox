import type { Credentials } from "google-auth-library";
import { youtube, auth as Auth } from "@googleapis/youtube";
import { createLogger } from "../utils/logger";

import {
  googleClientId,
  googleClientSecret,
  googleRedirectUri,
} from "./config";

const logger = createLogger({
  name: "youtube-toolbox/lambda/youtube/livechat",
});

function googleOAuthCredentials(credentials: Credentials) {
  const auth = new Auth.OAuth2({
    clientId: googleClientId,
    clientSecret: googleClientSecret,
    redirectUri: googleRedirectUri,
  });
  auth.setCredentials(credentials);
  return auth;
}

export async function findLatestLiveBroadcast(credentials: Credentials) {
  logger.debug("Finding latest live broadcast");
  const auth = googleOAuthCredentials(credentials);
  const yt = youtube({ version: "v3", auth });
  const response = await yt.liveBroadcasts.list({
    part: ["snippet", "contentDetails", "status"],
    broadcastType: "all",
    mine: true,
  });
  const broadcasts = response.data;
  if (!broadcasts.items || broadcasts.items.length === 0) {
    logger.debug("No live broadcasts found");
    return null;
  }
  logger.debug(`Found ${broadcasts.items.length} live broadcasts`);
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
    logger.debug(
      `No live chat id found for live broadcast ${liveBroadcast?.snippet?.title}`
    );
    return null;
  }
  logger.debug(
    `Found live chat id ${liveBroadcast?.snippet?.liveChatId} for live broadcast ${liveBroadcast?.snippet?.title}`
  );
  return liveBroadcast.snippet?.liveChatId;
}

export async function fetchLivechat(
  credentials: Credentials,
  liveChatId: string,
  pageToken?: string
) {
  logger.debug(`Fetching live chat ${liveChatId}`);
  const auth = googleOAuthCredentials(credentials);
  const yt = youtube({ version: "v3", auth });
  const response = await yt.liveChatMessages.list({
    liveChatId,
    part: ["snippet", "authorDetails"],
    maxResults: 100,
    pageToken,
  });
  if (!response.data.items) {
    logger.debug(`No live chat messages found for live chat ${liveChatId}`);
    return null;
  }
  logger.debug(
    `Fetched live chat ${liveChatId} with ${response.data.items.length} messages`
  );
  return response.data;
}
