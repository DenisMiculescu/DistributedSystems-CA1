import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import Ajv from "ajv";
import schema from "../shared/types.schema.json";

const ajv = new Ajv();
const isValidBodyParams = ajv.compile(schema.definitions["Team"] || {});
const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));

    const teamId = event.pathParameters?.id;
    const body = event.body ? JSON.parse(event.body) : undefined;

    if (!teamId) {
      return {
        statusCode: 400,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: "Missing team ID in path parameters" }),
      };
    }

    if (!body) {
      return {
        statusCode: 400,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: "Missing request body" }),
      };
    }

    if (!isValidBodyParams(body)) {
      return {
        statusCode: 400,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          message: "Invalid body format. Must match Team schema",
          schema: schema.definitions["Team"],
        }),
      };
    }

    const updateExpression = Object.keys(body)
      .map((key) => `#${key} = :${key}`)
      .join(", ");
    
    const expressionAttributeNames = Object.fromEntries(
      Object.keys(body).map((key) => [`#${key}`, key])
    );

    const expressionAttributeValues = Object.fromEntries(
      Object.keys(body).map((key) => [`:${key}`, body[key]])
    );

    const commandOutput = await ddbDocClient.send(
      new UpdateCommand({
        TableName: process.env.TABLE_NAME,
        Key: { id: teamId },
        UpdateExpression: `SET ${updateExpression}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: "UPDATED_NEW",
      })
    );

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        message: `Team with ID ${teamId} updated successfully`,
        updatedAttributes: commandOutput.Attributes,
      }),
    };
  } catch (error: any) {
    console.error("[ERROR]", JSON.stringify(error));
    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ error }),
    };
  }
};

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = {
    wrapNumbers: false,
  };
  const translateConfig = { marshallOptions, unmarshallOptions };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
