import { SNS } from "@aws-sdk/client-sns";

export function createSNS() {
  return new SNS({
    apiVersion: "2010-03-31",
  });
}

export async function publishOne<T>(payload: T, topic: string) {
  const sns = createSNS();
  const { MessageId } = await sns.publish({
    Message: JSON.stringify(payload),
    TopicArn: topic,
  });
  return MessageId;
}
