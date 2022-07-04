import {
  TPingAction,
  TConnectedAction,
  TInitAction,
  TLivechatOpenAction,
  TAllActions,
} from "@youtube-toolbox/models/src/socketConnection";

export function ping(): TPingAction {
  return {
    type: "ping",
  };
}

export function openLivechat(): TInitAction {
  return {
    type: "openLivechat",
  };
}

export function toAction(rawData: MessageEvent<any>): TAllActions {
  return JSON.parse(rawData.toString());
}

export function isOkAction(action: TAllActions): action is TConnectedAction {
  return action.type === "connected";
}

export function isLiveChatOpenAction(
  action: TAllActions
): action is TLivechatOpenAction {
  return action.type === "livechatOpen";
}
