import { createLogger } from "../utils/logger";

const logger = createLogger({
  name: "functions/queue/pubsub",
});

export interface IDestination {
  connectionId: string;
  messageEndpoint: string;
}
export interface IPublisher<T> {
  emit(event: string, data: T): Promise<void>;
}

export interface ISubscriber<T> {
  on(event: string, listener: (data: T) => void): void;
}

let publisher: IPublisher<unknown> | null = null;
let subscriber: ISubscriber<unknown> | null = null;

export function setPublisher(_publisher: IPublisher<unknown>) {
  publisher = _publisher;
}

export function setSubscriber(_subscriber: ISubscriber<unknown>) {
  subscriber = _subscriber;
}

export async function publish<T>(topic: string, data: T) {
  if (!publisher) {
    logger.info("No publisher set");
  }
  publisher?.emit(topic, data);
}

export function subscribe(topic: string, listener: (data: any) => void) {
  if (!subscriber) {
    logger.info("No subscriber set");
  }
  subscriber?.on(topic, listener);
}
