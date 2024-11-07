import * as cdk from 'aws-cdk-lib';
import * as lambdanode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import { generateBatch } from "../shared/util";
import {teams} from "../seed/teams";


import { Construct } from 'constructs';

export class Ca1Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const teamsTable = new dynamodb.Table(this, "TeamsTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "id", type: dynamodb.AttributeType.NUMBER },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "Teams",
    });

    const simpleFn = new lambdanode.NodejsFunction(this, "SimpleFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/simple.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
    });

    const simpleFnURL = simpleFn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.AWS_IAM,  
      cors: {
        allowedOrigins: ["*"],
      },
    });

    new cdk.CfnOutput(this, "Simple Function Url", { value: simpleFnURL.url });

    new custom.AwsCustomResource(this, "teamsddbInitData", {
      onCreate: {
        service: "DynamoDB",
        action: "batchWriteItem",
        parameters: {
          RequestItems: {
            [teamsTable.tableName]: generateBatch(teams),
          },
        },
        physicalResourceId: custom.PhysicalResourceId.of("teamsddbInitData"), 
      },
      policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [teamsTable.tableArn],
      }),
    });

  }
}