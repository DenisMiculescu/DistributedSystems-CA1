import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { TeamMemberQueryParams } from "../shared/types.ts";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";
import Ajv from "ajv";
import schema from "../shared/types.schema.json";

const ajv = new Ajv();
const isValidQueryParams = ajv.compile(
  schema.definitions["TeamMemberQueryParams"] || {}
);
 
const ddbDocClient = createDocumentClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));
    const queryParams = event.queryStringParameters;
    if (!queryParams) {
      return {
        statusCode: 500,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: "Missing query parameters" }),
      };
    }
    if (!isValidQueryParams(queryParams)) {
      return {
        statusCode: 500,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          message: `Incorrect type. Must match Query parameters schema`,
          schema: schema.definitions["TeamMemberQueryParams"],
        }),
      };
    }
    
    const teamId = parseInt(queryParams.teamId);
    let commandInput: QueryCommandInput = {
      TableName: process.env.MEMBERS_TABLE_NAME,
    };
    if ("memberPosition" in queryParams) {
      commandInput = {
        ...commandInput,
        IndexName: "roleIx",
        KeyConditionExpression: "teamId = :m and begins_with(memberPosition, :r) ",
        ExpressionAttributeValues: {
          ":m": teamId,
          ":r": queryParams.memberPosition,
        },
      };
    } else if ("memberName" in queryParams) {
      commandInput = {
        ...commandInput,
        KeyConditionExpression: "teamId = :m and begins_with(memberName, :a) ",
        ExpressionAttributeValues: {
          ":m": teamId,
          ":a": queryParams.memberName,
        },
      };
    } else {
      commandInput = {
        ...commandInput,
        KeyConditionExpression: "teamId = :m",
        ExpressionAttributeValues: {
          ":m": teamId,
        },
      };
    }
    
    const commandOutput = await ddbDocClient.send(
      new QueryCommand(commandInput)
      );
      
      return {
        statusCode: 200,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          data: commandOutput.Items,
        }),
      };
    } catch (error: any) {
      console.log(JSON.stringify(error));
      return {
        statusCode: 500,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ error }),
      };
    }
  };
  
  function createDocumentClient() {
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