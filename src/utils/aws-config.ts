import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Initialize the DynamoDB client
// When running on EC2 with IAM roles, we only need to specify the region
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

// Create a document client for DynamoDB
const docClient = DynamoDBDocumentClient.from(client);

export { client, docClient }; 