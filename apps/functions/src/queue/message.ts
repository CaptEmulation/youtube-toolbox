export interface ILazyMessage<T> {
  readonly payload: T;
  readonly messageEndpoint: string;
  readonly connectionId: string;
  readonly type: "lazy";
}

export function parseLazyMessage<T>(message: string): ILazyMessage<T> {
  const payload = JSON.parse(message);
  if (payload.type !== "lazy") {
    throw new Error(`Unknown message ${message}`);
  }
  return payload;
}
