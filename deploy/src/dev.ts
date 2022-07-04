import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";

export interface IProps extends cdk.StackProps {
  bucketName?: string;
}

export class DevStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: IProps) {
    const { bucketName, ...rest } = props;
    super(scope, id, rest);

    const bucket = new s3.Bucket(this, "Bucket", {
      bucketName,
    });

    new cdk.CfnOutput(this, "BucketName", {
      value: bucket.bucketName,
    });
  }
}
