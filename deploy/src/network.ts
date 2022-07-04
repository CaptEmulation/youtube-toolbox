import * as cdk from "aws-cdk-lib";
import * as route53 from "aws-cdk-lib/aws-route53";

export interface IProps extends cdk.StackProps {
  readonly domain: string;
}

export class NetworkStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: IProps) {
    const { domain, ...rest } = props;
    super(scope, id, rest);

    const hostedZone = new route53.HostedZone(this, "hosted_zone", {
      zoneName: domain,
    });
    new cdk.CfnOutput(this, "NameServers", {
      value: cdk.Fn.join(", ", hostedZone.hostedZoneNameServers || []),
    });
  }
}
