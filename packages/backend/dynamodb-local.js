const { DynamoDB } = require('aws-sdk');
const DynamoDbLocal = require('dynamodb-local');
const tableConfig = require('./jest-dynamodb-config');
const { createServer } = require('dynamodb-admin');

// optional config customization - default is your OS' temp directory and an Amazon server from US West
DynamoDbLocal.configureInstaller({});

DynamoDbLocal.launch(tableConfig.port)
  .then(async function (ChildProcess) {
    console.log('PID created: ', ChildProcess.pid);
    const config = {
      endpoint: `http://localhost:${tableConfig.port}`,
      region: "local-env",
    }
    console.log(`Creating DynamoDB client with config: ${JSON.stringify(config)}`);
    const dynamodb = new DynamoDB({
      endpoint: `http://localhost:${tableConfig.port}`,
      region: "local-env",
    });
    const dynClient = new DynamoDB.DocumentClient({ service: dynamodb });

    for (const table of tableConfig.tables) {
      console.log(`Creating table ${table.TableName}`);
      await dynamodb.createTable({
        TableName: table.TableName,
        AttributeDefinitions: table.AttributeDefinitions,
        KeySchema: table.KeySchema,
        BillingMode: table.BillingMode,
        GlobalSecondaryIndexes: table.GlobalSecondaryIndexes,
        LocalSecondaryIndexes: table.LocalSecondaryIndexes,
      }).promise();
      if (table.TimeToLiveSpecification) {
        console.log(`Setting TTL on table ${table.TableName}`);
        await dynamodb.updateTimeToLive({
          TableName: table.TableName,
          TimeToLiveSpecification: table.TimeToLiveSpecification,
        }).promise();
      }
    }
    console.log(`Finished creating tables`);
    const adminApp = await createServer(dynamodb, dynClient);
    const port = 8001;
    const server = adminApp.listen(port);
    server.on('listening', () => {
      const address = server.address();
      console.log(`  listening on http://0.0.0.0:${address.port}`);
    });
  }).catch(function (err) {
    console.error(err);
  });
