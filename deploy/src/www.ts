import path from "path";
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as ecra from "aws-cdk-lib/aws-ecr-assets";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as patterns from "aws-cdk-lib/aws-route53-patterns";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as apigwv2 from "@aws-cdk/aws-apigatewayv2-alpha";

export interface IProps extends cdk.StackProps {
  readonly domain?: [string, string] | string;
  readonly websocketApi: apigwv2.WebSocketApi;
  readonly sessionsTable: cdk.aws_dynamodb.Table;
}

export class WwwStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: IProps) {
    const { domain, sessionsTable, websocketApi, ...rest } = props;
    super(scope, id, rest);

    const staticAssets = new s3.Bucket(this, "StaticAssets");
    new s3deploy.BucketDeployment(this, "AssetDeployment", {
      sources: [
        s3deploy.Source.asset(path.join(__dirname, "../.layers/assets")),
      ],
      destinationBucket: staticAssets,
    });

    // Domain

    let hostedZone: cdk.aws_route53.IHostedZone | null = null;
    let domainName: string | null = null;
    let certificate: acm.DnsValidatedCertificate | null = null;
    let wwwCertificate: acm.DnsValidatedCertificate | null = null;
    if (domain) {
      const domains = domain instanceof Array ? domain : [domain];
      domainName = domains.join(".");
      hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
        domainName: domains.length === 2 ? domains[1] : domains[0],
      });
      certificate = new acm.DnsValidatedCertificate(this, "certificate", {
        domainName: domainName,
        hostedZone: hostedZone,
        region: "us-east-1",
      });
      wwwCertificate = new acm.DnsValidatedCertificate(
        this,
        "www-certificate",
        {
          domainName: `www.${domainName}`,
          hostedZone,
          region: "us-east-1",
        }
      );
    }

    // // Create a new SSM Parameter holding the table name, because we can
    // // not pass env vars into edge lambdas
    const wwwParams = new ssm.StringParameter(this, "Parameters", {
      description: "Deploy time details for edge functions",
      parameterName: `${id}_Params`,
      stringValue: JSON.stringify({
        dynamoDbRegion: "us-east-1",
        sessionsTable: sessionsTable.tableName,
      }),
    });

    const apiHandler = new lambda.Function(this, "apiHandler", {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../.layers/api-lambda")
      ),
      memorySize: 512,
      timeout: cdk.Duration.seconds(10),
    });

    sessionsTable.grantReadWriteData(apiHandler);
    wwwParams.grantRead(apiHandler);

    const defaultHandler = new lambda.Function(this, "defaultHandler", {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../.layers/default-lambda")
      ),
      memorySize: 512,
      timeout: cdk.Duration.seconds(10),
    });

    sessionsTable.grantReadWriteData(defaultHandler);

    // const imageHandler = new lambda.Function(this, "imageHandler", {
    //   runtime: lambda.Runtime.NODEJS_16_X,
    //   handler: "index.handler",
    //   code: lambda.Code.fromAsset(
    //     path.join(__dirname, "../.layers/image-lambda")
    //   ),
    //   memorySize: 512,
    //   timeout: cdk.Duration.seconds(10),
    // });
    // staticAssets.grantReadWrite(imageHandler);

    const defaultCachePolicy = new cloudfront.CachePolicy(
      this,
      "defaultCachePolicy",
      {
        defaultTtl: cdk.Duration.days(1),
        minTtl: cdk.Duration.seconds(0),
        maxTtl: cdk.Duration.days(30),
        headerBehavior: cloudfront.CacheHeaderBehavior.none(),
        queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
        cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      }
    );
    // const imageCachePolicy = new cloudfront.CachePolicy(
    //   this,
    //   "imageCachePolicy",
    //   {
    //     defaultTtl: cdk.Duration.days(60),
    //     minTtl: cdk.Duration.seconds(0),
    //     maxTtl: cdk.Duration.days(30),
    //     headerBehavior: cloudfront.CacheHeaderBehavior.allowList("Accept"),
    //     queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
    //     cookieBehavior: cloudfront.CacheCookieBehavior.none(),
    //   }
    // );
    const permissiveCachePolicy = new cloudfront.CachePolicy(
      this,
      "permissive",
      {
        defaultTtl: cdk.Duration.minutes(0),
        minTtl: cdk.Duration.minutes(0),
        maxTtl: cdk.Duration.days(30),
        cookieBehavior: cloudfront.CacheCookieBehavior.all(),
        queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
        headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
          "Authorization",
          "Host"
        ),
      }
    );
    const wsOriginRequestPolicy = new cloudfront.OriginRequestPolicy(
      this,
      "webSocketPolicy",
      {
        originRequestPolicyName: "webSocketPolicy",
        comment: "A default WebSocket policy",
        cookieBehavior: cloudfront.OriginRequestCookieBehavior.all(),
        headerBehavior: cloudfront.OriginRequestHeaderBehavior.allowList(
          "Sec-WebSocket-Key",
          "Sec-WebSocket-Version",
          "Sec-WebSocket-Protocol",
          "Sec-WebSocket-Accept"
        ),
        queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.none(),
      }
    );
    const websocketOrigin = cdk.Fn.parseDomainName(websocketApi.apiEndpoint);
    const distribution = new cloudfront.Distribution(this, "www", {
      ...(certificate && domainName
        ? {
            certificate,
            domainNames: [domainName],
          }
        : {}),
      priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,

      defaultBehavior: {
        origin: new origins.S3Origin(staticAssets),
        edgeLambdas: [
          {
            functionVersion: defaultHandler.currentVersion,
            eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
          },
          {
            functionVersion: defaultHandler.currentVersion,
            eventType: cloudfront.LambdaEdgeEventType.ORIGIN_RESPONSE,
          },
        ],
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        compress: true,
        cachePolicy: permissiveCachePolicy,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      additionalBehaviors: {
        "/ws": {
          origin: new origins.HttpOrigin(websocketOrigin),
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: wsOriginRequestPolicy,
          edgeLambdas: [
            {
              eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
              functionVersion: new cloudfront.experimental.EdgeFunction(
                this,
                "WsOriginRequest",
                {
                  code: lambda.Code.fromAsset(
                    path.join(__dirname, "./edge/wsToProdOriginRequest")
                  ),
                  handler: "index.handler",
                  runtime: lambda.Runtime.NODEJS_16_X,
                }
              ),
            },
          ],
        },
        // "_next/image*": {
        //   origin: new origins.S3Origin(staticAssets),
        //   cachePolicy: imageCachePolicy,
        //   edgeLambdas: [
        //     {
        //       functionVersion: imageHandler.currentVersion,
        //       eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
        //     },
        //   ],
        //   viewerProtocolPolicy:
        //     cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        // },
        "_next/static/*": {
          origin: new origins.S3Origin(staticAssets),
          cachePolicy: defaultCachePolicy,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
        "static/*": {
          origin: new origins.S3Origin(staticAssets),
          cachePolicy: defaultCachePolicy,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
        "api/*": {
          origin: new origins.S3Origin(staticAssets),
          edgeLambdas: [
            {
              functionVersion: apiHandler.currentVersion,
              includeBody: true,
              eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
            },
          ],
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: permissiveCachePolicy,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
        "_next/data/*": {
          origin: new origins.S3Origin(staticAssets),
          edgeLambdas: [
            {
              functionVersion: defaultHandler.currentVersion,
              eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
            },
            {
              functionVersion: defaultHandler.currentVersion,
              eventType: cloudfront.LambdaEdgeEventType.ORIGIN_RESPONSE,
            },
          ],
          cachePolicy: new cloudfront.CachePolicy(this, "data", {
            defaultTtl: cdk.Duration.minutes(0),
            minTtl: cdk.Duration.minutes(0),
            maxTtl: cdk.Duration.days(30),
            cookieBehavior: cloudfront.CacheCookieBehavior.all(),
            queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
            headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
              "Authorization",
              "Host"
            ),
          }),
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
      },
    });
    if (domainName && hostedZone && wwwCertificate) {
      new patterns.HttpsRedirect(this, "httpsRedirect", {
        recordNames: [`www.${domainName}`],
        targetDomain: domainName,
        zone: hostedZone,
        certificate: wwwCertificate,
      });
      new route53.ARecord(this, "ipv4-record", {
        zone: hostedZone,
        recordName: domainName,
        target: route53.RecordTarget.fromAlias(
          new targets.CloudFrontTarget(distribution)
        ),
      });
      new route53.AaaaRecord(this, "ipv6-record", {
        zone: hostedZone,
        recordName: domainName,
        target: route53.RecordTarget.fromAlias(
          new targets.CloudFrontTarget(distribution)
        ),
      });
    }
    new cdk.CfnOutput(this, "distributionUrl", {
      value: distribution.distributionDomainName,
      description: "Distribution URL",
    });
    new cdk.CfnOutput(this, "wwwParams", {
      value: wwwParams.parameterName,
    });
  }
}
