import { youtube_v3 } from "googleapis";
import { GaxiosResponse } from "googleapis-common";

export async function fetchLiveMessage({
  youtube,
  liveChatId,
  maxResults,
  pageToken,
}: {
  youtube: youtube_v3.Youtube;
  liveChatId: string;
  maxResults?: number;
  pageToken?: string;
}): Promise<GaxiosResponse<youtube_v3.Schema$LiveChatMessageListResponse>> {
  const response = await youtube.liveChatMessages.list({
    liveChatId,
    maxResults,
    pageToken,
  });
  return response;
}

export async function* generateLiveMessages({
  liveChatId,
  youtube,
  abortController,
}: {
  youtube: youtube_v3.Youtube;
  liveChatId: string;
  abortController: AbortController;
}) {
  let pageToken: string | undefined = undefined;
  do {
    const response: GaxiosResponse<youtube_v3.Schema$LiveChatMessageListResponse> =
      await fetchLiveMessage({ youtube, liveChatId, pageToken });
    pageToken = response.data.nextPageToken ?? undefined;
    const nowTime = Date.now();
    yield response.data.items;
    // Calculate the remaining time to wait before making another request for live chat messages.
    const remainingTime =
      response.data.pollingIntervalMillis ?? 0 - (Date.now() - nowTime);
    if (remainingTime > 0) {
      await new Promise((resolve) => {
        setTimeout(resolve, remainingTime);
      });
    }
  } while (!abortController.signal.aborted && pageToken);
}
