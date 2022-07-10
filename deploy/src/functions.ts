import { dotSecret } from "./utils/secrets";
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as sns from "aws-cdk-lib/aws-sns";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as apigwv2 from "@aws-cdk/aws-apigatewayv2-alpha";
import * as eventSources from "aws-cdk-lib/aws-lambda-event-sources";
import { WebSocketLambdaIntegration } from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import path from "path";

export interface IProps extends cdk.StackProps {
  readonly domain?: [string, string] | string;
  readonly dotFile: string;
}

export class FunctionStack extends cdk.Stack {
  public sessionsTable: cdk.aws_dynamodb.Table;
  public websocketApi: apigwv2.WebSocketApi;

  constructor(scope: cdk.App, id: string, props: IProps) {
    const { domain, dotFile, ...rest } = props;
    super(scope, id, rest);
    const env = dotSecret(dotFile);

    const socketConnectionTable = new dynamodb.Table(
      this,
      "SocketConnections",
      {
        partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
        sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
        timeToLiveAttribute: "expires",
      }
    );
    socketConnectionTable.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: { name: "GSI1PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI1SK", type: dynamodb.AttributeType.STRING },
    });

    const sessionsTable = new dynamodb.Table(this, `Sessions`, {
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      timeToLiveAttribute: "expires",
    });
    sessionsTable.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: { name: "GSI1PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI1SK", type: dynamodb.AttributeType.STRING },
    });

    const loyaltyTable = new dynamodb.Table(this, `LoyaltyPoints`, {
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      timeToLiveAttribute: "expires",
    });
    loyaltyTable.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: { name: "GSI1PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI1SK", type: dynamodb.AttributeType.STRING },
    });

    const liveMessageQueue = new sqs.Queue(this, "liveMessageQueue", {
      visibilityTimeout: cdk.Duration.seconds(300),
      retentionPeriod: cdk.Duration.days(1),
    });
    const liveMessageTopic = new sns.Topic(this, "liveMessageTopic");
    liveMessageTopic.addSubscription(
      new subs.SqsSubscription(liveMessageQueue)
    );

    const lazyMessageQueue = new sqs.Queue(this, "lazyMessageQueue", {
      visibilityTimeout: cdk.Duration.seconds(300),
      retentionPeriod: cdk.Duration.days(1),
    });
    const lazyMessageTopic = new sns.Topic(this, "lazyMessageTopic");
    lazyMessageTopic.addSubscription(
      new subs.SqsSubscription(lazyMessageQueue)
    );

    const lazyMessageHandler = new lambda.Function(this, "lazyMessageHandler", {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../.layers/sqs-lazy-message")
      ),
      handler: "index.handler",
      timeout: cdk.Duration.seconds(5),
      memorySize: 128,
      environment: {
        MINIMUM_LOG_LEVEL: "INFO",
        LAZY_MESSAGE_TOPIC_ARN: lazyMessageTopic.topicArn,
        ...env,
      },
      events: [
        new eventSources.SqsEventSource(lazyMessageQueue, {
          batchSize: 3,
        }),
      ],
    });

    const websocketConnectHandler = new lambda.Function(this, "connect", {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../.layers/websocket-connect")
      ),
      handler: "index.handler",
      timeout: cdk.Duration.seconds(5),
      memorySize: 256,
      environment: {
        MINIMUM_LOG_LEVEL: "INFO",
        TABLE_NAME_SESSION: sessionsTable.tableName,
        TABLE_NAME_SOCKET_CONNECTIONS: socketConnectionTable.tableName,
        LIVECHAT_MESSAGE_TOPIC_ARN: liveMessageTopic.topicArn,
        LAZY_MESSAGE_TOPIC_ARN: lazyMessageTopic.topicArn,
        ...env,
      },
    });
    socketConnectionTable.grantReadWriteData(websocketConnectHandler);
    sessionsTable.grantReadData(websocketConnectHandler);
    lazyMessageTopic.grantPublish(websocketConnectHandler);

    const websocketDisconnectHandler = new lambda.Function(this, "disconnect", {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../.layers/websocket-disconnect")
      ),
      handler: "index.handler",
      timeout: cdk.Duration.seconds(5),
      memorySize: 256,
      environment: {
        MINIMUM_LOG_LEVEL: "INFO",
        TABLE_NAME_SESSION: sessionsTable.tableName,
        TABLE_NAME_SOCKET_CONNECTIONS: socketConnectionTable.tableName,
        LIVECHAT_MESSAGE_TOPIC_ARN: liveMessageTopic.topicArn,
        ...env,
      },
    });
    socketConnectionTable.grantReadWriteData(websocketDisconnectHandler);
    sessionsTable.grantReadData(websocketDisconnectHandler);

    const websocketMessageHandler = new lambda.Function(this, "message", {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../.layers/websocket-message")
      ),
      handler: "index.handler",
      timeout: cdk.Duration.seconds(5),
      memorySize: 256,
      environment: {
        MINIMUM_LOG_LEVEL: "INFO",
        TABLE_NAME_SESSION: sessionsTable.tableName,
        TABLE_NAME_SOCKET_CONNECTIONS: socketConnectionTable.tableName,
        LIVECHAT_MESSAGE_TOPIC_ARN: liveMessageTopic.topicArn,
        ...env,
      },
    });
    socketConnectionTable.grantReadWriteData(websocketMessageHandler);
    sessionsTable.grantReadData(websocketMessageHandler);
    liveMessageTopic.grantPublish(websocketMessageHandler);

    let hostedZone: cdk.aws_route53.IHostedZone | null = null;
    let domainName: string | null = null;
    let certificate: acm.DnsValidatedCertificate | null = null;
    if (domain) {
      const domains = domain instanceof Array ? domain : [domain];
      domainName = domains.join(".");
      hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
        domainName: domains.length === 2 ? domains[1] : domains[0],
      });
      certificate = new acm.DnsValidatedCertificate(this, "certificate", {
        domainName: domainName,
        hostedZone: hostedZone,
        region: props.env?.region,
      });
    }

    const defaultMessageIntegration = new WebSocketLambdaIntegration(
      "DefaultIntegration",
      websocketMessageHandler
    );
    const webSocketApi = new apigwv2.WebSocketApi(this, "Api", {
      apiName: "WebsocketApi",
      description: "Toolbox websocket",
      routeSelectionExpression: "$request.body.action",
      ...(domainName && certificate
        ? {
            domainName: {
              domainName,
              certificate,
            },
          }
        : {}),
      connectRouteOptions: {
        integration: new WebSocketLambdaIntegration(
          "ConnectIntegration",
          websocketConnectHandler
        ),
      },
      disconnectRouteOptions: {
        integration: new WebSocketLambdaIntegration(
          "DisconnectIntegration",
          websocketDisconnectHandler
        ),
      },
      defaultRouteOptions: {
        integration: defaultMessageIntegration,
      },
    });

    const webSocketStage = new apigwv2.WebSocketStage(this, "Stage", {
      webSocketApi,
      stageName: "Prod",
      autoDeploy: true,
    });

    webSocketStage.grantManagementApiAccess(websocketMessageHandler);
    webSocketApi.addRoute("openLivechat", {
      integration: defaultMessageIntegration,
    });
    webSocketApi.addRoute("ping", {
      integration: defaultMessageIntegration,
    });

    webSocketStage.grantManagementApiAccess(lazyMessageHandler);
    webSocketStage.grantManagementApiAccess(websocketMessageHandler);

    // if (domainName && hostedZone && certificate) {
    //   new apigwv2.ApiMapping(this, "ApiMapping", {
    //     api: webSocketApi,
    //     domainName: new apigwv2.DomainName(this, "DomainName", {
    //       domainName,
    //       certificate,
    //     }),
    //   });
    // }
    new cdk.CfnOutput(this, "WebSocketApi", {
      value: webSocketApi.apiEndpoint,
      description: "Websocket API URL",
    });
    new cdk.CfnOutput(this, "SessionsTable", {
      value: sessionsTable.tableName,
      description: "Sessions table name",
    });

    this.sessionsTable = sessionsTable;
    this.websocketApi = webSocketApi;
  }
}
