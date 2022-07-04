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
import * as route53 from "aws-cdk-lib/aws-route53";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import { NetworkMode } from "aws-cdk-lib/aws-ecr-assets";

export interface IProps extends cdk.StackProps {
  readonly domain: [string, string] | string;
}

export class WwwStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: IProps) {
    const { domain, ...rest } = props;
    super(scope, id, rest);

    const staticAssets = new s3.Bucket(this, "StaticAssets", {
      transferAcceleration: true,
    });
    new s3deploy.BucketDeployment(this, "AssetDeployment", {
      sources: [
        s3deploy.Source.asset(path.join(__dirname, "../.build/assets")),
      ],
      destinationBucket: staticAssets,
    });

    // const exampleTable = new dynamodb.Table(this, "Example", {
    //   partitionKey: { name: "key", type: dynamodb.AttributeType.STRING },
    //   timeToLiveAttribute: "ttl",
    //   tableClass: dynamodb.TableClass.STANDARD,
    //   billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    // });

    // // Create a new SSM Parameter holding the table name, because we can
    // // not pass env vars into edge lambdas
    // const param = new ssm.StringParameter(this, "ExampleTableName", {
    //   description: "The example table for whatever",
    //   parameterName: `${id}_ExampleTableName`,
    //   stringValue: exampleTable.tableName,
    // });

    // Domain
    const domains = domain instanceof Array ? domain : [domain];
    const domainName = domains.join(".");
    const hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
      domainName: domains.length === 2 ? domains[1] : domains[0],
    });

    const certificate = new acm.DnsValidatedCertificate(this, "certificate", {
      domainName,
      hostedZone,
      region: props.env?.region,
    });

    const apiHandler = new lambda.Function(this, "apiHandler", {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../.build/api-lambda")),
      memorySize: 512,
      timeout: cdk.Duration.seconds(10),
    });

    // const puppeteerLambdaBaseImage = new ecra.DockerImageAsset(
    //   this,
    //   "PuppeteerFunction",
    //   {
    //     networkMode: NetworkMode.HOST,
    //     directory: path.resolve(__dirname, "../.build/api-lambda"),
    //     file: "../../containers/puppeteer/Dockerfile",
    //   }
    // );
    // const puppeteerApiHandler = new lambda.DockerImageFunction(
    //   this,
    //   "puppeteerApiHandler",
    //   {
    //     code: lambda.DockerImageCode.fromImageAsset(
    //       path.resolve(__dirname, "../.build/api-lambda"),
    //       {
    //         networkMode: NetworkMode.HOST,
    //         file: "../../containers/puppeteer/Dockerfile",
    //       }
    //     ),
    //     memorySize: 768,
    //     timeout: cdk.Duration.seconds(30),
    //   }
    // );
    // exampleTable.grantReadWriteData(apiHandler);
    // param.grantRead(apiHandler);

    const defaultHandler = new lambda.Function(this, "defaultHandler", {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../.build/default-lambda")
      ),
      memorySize: 512,
      timeout: cdk.Duration.seconds(10),
    });

    const imageHandler = new lambda.Function(this, "imageHandler", {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../.build/image-lambda")
      ),
      memorySize: 512,
      timeout: cdk.Duration.seconds(10),
    });
    staticAssets.grantReadWrite(imageHandler);

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
    const imageCachePolicy = new cloudfront.CachePolicy(
      this,
      "imageCachePolicy",
      {
        defaultTtl: cdk.Duration.days(60),
        minTtl: cdk.Duration.seconds(0),
        maxTtl: cdk.Duration.days(30),
        headerBehavior: cloudfront.CacheHeaderBehavior.allowList("Accept"),
        queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
        cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      }
    );
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
    const distribution = new cloudfront.Distribution(this, "www", {
      certificate,
      domainNames: [domainName],
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
      },
      additionalBehaviors: {
        "_next/image*": {
          origin: new origins.S3Origin(staticAssets),
          cachePolicy: imageCachePolicy,
          edgeLambdas: [
            {
              functionVersion: imageHandler.currentVersion,
              eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
            },
          ],
        },
        "_next/static/*": {
          origin: new origins.S3Origin(staticAssets),
          cachePolicy: defaultCachePolicy,
        },
        "static/*": {
          origin: new origins.S3Origin(staticAssets),
          cachePolicy: defaultCachePolicy,
        },
        // "api/render/*": {
        //   origin: new origins.S3Origin(staticAssets),
        //   edgeLambdas: [
        //     {
        //       functionVersion: puppeteerApiHandler.currentVersion,
        //       includeBody: true,
        //       eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
        //     },
        //   ],
        //   allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        //   cachePolicy: permissiveCachePolicy,
        // },
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
        },
      },
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
}
