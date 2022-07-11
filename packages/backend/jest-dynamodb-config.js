
/** @type {Array.<import("aws-sdk").DynamoDB.CreateTableInput & { TimeToLiveSpecification?: import("aws-sdk").DynamoDB.TimeToLiveSpecification}}>} */
const tables = [
  {
    /*
     *  Table name: SocketConnections
     *
     *  Description: Holds information about open socket connections
     * 
     *   pk                 sk                        expires  Token...        MessageEndpoint  
     *  +------------------+-------------------------+--------+---------------+----------------+
     *  |                  | MESSAGE_ENDPOINT#id     | 111111 | .........     | .............. |
     *  | CONNECTION_ID#id | LIVECHAT_ID#id          | 111111 | .........     | .............. |
     *  |                  | LIVECHAT_ID#id#nextPage | 111111 | .........     | .............. |
     *  +------------------+-------------------------+--------+---------------+----------------+
     * 
     *  Global Secondary Index 1:
     *   GSI1PK                    GSI1SK             expires  Token...        MessageEndpoint  
     *  +-------------------------+------------------+--------+---------------+----------------+ 
     *  | MESSAGE_ENDPOINT#id     |                  | 111111 | .........     | .............. | 
     *  | LIVECHAT_ID#id          | CONNECTION_ID#id | 111111 | .........     | .............. |
     *  | LIVECHAT_ID#id#nextPage |                  | 111111 | .........     | .............. |
     *  +-------------------------+------------------+--------+---------------+----------------+   
     *  
     */
    TableName: `SocketConnections`,
    KeySchema: [{
      AttributeName: "pk", KeyType: "HASH"
    }, {
      AttributeName: "sk", KeyType: "RANGE"
    }],
    AttributeDefinitions: [{
      AttributeName: "pk", AttributeType: "S",
    }, {
      AttributeName: "sk", AttributeType: "S",
    }, {
      AttributeName: "GSI1PK", AttributeType: "S"
    }, {
      AttributeName: "GSI1SK", AttributeType: "S"
    }],
    GlobalSecondaryIndexes: [{
      IndexName: 'GSI1',
      KeySchema: [{ AttributeName: "GSI1PK", KeyType: "HASH" }, { AttributeName: "GSI1SK", KeyType: "RANGE" }],
      Projection: { ProjectionType: "ALL" },
    }],
    BillingMode: "PAY_PER_REQUEST",
    TimeToLiveSpecification: {
      AttributeName: "expires",
      Enabled: true
    },
  }, {
    /* Table name: LiveChatMessages
     *
     * Description: Used to retrieve stale message for example when re-connecting
     *
     *  pk                 sk                 expires  Message         tipNextPage
     * +------------------+------------------+--------+---------------+-----------+
     * | LIVECHAT_ID#id   | LIVECHAT_ID#id   |        |               | 123       |
     * +------------------+------------------+--------+---------------+-----------+
     * |                  | NEXT_PAGE#id     | 111111 | .........     |           |
     * | LIVECHAT_ID#id   | NEXT_PAGE#id     | 111111 | .........     |           |
     * |                  | NEXT_PAGE#id     | 111111 | .........     |           |
     * +------------------+------------------+--------+---------------+-----------+
     * 
     * Local Secondary Index 1:
     *  pk                      LSI1SK             
     * +-----------------------+------------------+
     * | LIVECHAT_ID#id        | createdAt        |
     * +-----------------------+------------------+
     *  
     */
    TableName: `LiveChatMessages`,
    KeySchema: [{
      AttributeName: "pk", KeyType: "HASH"
    }, {
      AttributeName: "sk", KeyType: "RANGE"
    }],
    AttributeDefinitions: [{
      AttributeName: "pk", AttributeType: "S",
    }, {
      AttributeName: "sk", AttributeType: "S",
    }],
    BillingMode: "PAY_PER_REQUEST",
    TimeToLiveSpecification: {
      AttributeName: "expires",
      Enabled: true
    }
  }, {
    /*
     * Table name: Sessions
     *
     * Description: Holds session information for next-auth
     * 
     * See https://next-auth.js.org/v3/adapters/dynamodb#schema for details
     * 
     */
    TableName: 'Sessions',
    KeySchema: [{ AttributeName: "pk", KeyType: "HASH" }, { AttributeName: "sk", KeyType: "RANGE" }],
    TimeToLiveSpecification: {
      AttributeName: "expires",
      Enabled: true
    },
    AttributeDefinitions: [{
      AttributeName: "pk", AttributeType: "S"
    }, {
      AttributeName: "sk", AttributeType: "S"
    }, {
      AttributeName: "GSI1PK", AttributeType: "S"
    }, {
      AttributeName: "GSI1SK", AttributeType: "S"
    }],
    BillingMode: "PAY_PER_REQUEST",
    GlobalSecondaryIndexes: [{
      IndexName: 'GSI1',
      KeySchema: [{ AttributeName: "GSI1PK", KeyType: "HASH" }, { AttributeName: "GSI1SK", KeyType: "RANGE" }],
      Projection: { ProjectionType: "ALL" },
    }],
  }, {
    /*
     * Table name: LoyaltyPoints
     * 
     * Description: Holds loyalty information
     * 
     *   pk                             sk                  points      expires
     *  +------------------------------+------------------+------------+--------+
     *  | CHANNEL_ID#id#recipientId    | POINTS#type      | number     | number |
     *  | CHANNEL_ID#id#recipientId    | POINTS#type      | number     | number |
     *  +------------------------------+------------------+------------+--------+
     * 
     *  Global Secondary Index 1:
     *  GSI1PK                   GSI1SK             
     *  +-----------------------+------------------+
     *  | CHANNEL_ID#id         | points           |
     *  +-----------------------+------------------+
     *  
     *  POINTS#type:
     *   - total: never expires, has GSI1PK and GSI1SK
     *   - chat: expires, posted a message, no GSI
     *   - membership: expires, subscribed to a channel, no GSI
     *   - gifted: expires, gifted a membership, no GSI
     *   - superchat: expires, used a superchat, no GSI
     */
    TableName: "LoyaltyPoints",
    KeySchema: [{
      AttributeName: "pk", KeyType: "HASH"
    }, {
      AttributeName: "sk", KeyType: "RANGE"
    }],
    AttributeDefinitions: [{
      AttributeName: "pk", AttributeType: "S"
    }, {
      AttributeName: "sk", AttributeType: "S"
    }, {
      AttributeName: "GSI1PK", AttributeType: "S"
    }, {
      AttributeName: "GSI1SK", AttributeType: "N"
    }],
    BillingMode: "PAY_PER_REQUEST",
    GlobalSecondaryIndexes: [{
      IndexName: 'GSI1',
      KeySchema: [{ AttributeName: "GSI1PK", KeyType: "HASH" }, { AttributeName: "GSI1SK", KeyType: "RANGE" }],
      Projection: { ProjectionType: "ALL" },
    }],
    TimeToLiveSpecification: {
      AttributeName: "expires",
      Enabled: true
    }
  }
]

module.exports = {
  tables,
  port: 8000,
};
