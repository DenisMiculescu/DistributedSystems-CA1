import * as cdk from 'aws-cdk-lib';
import * as lambdanode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import { generateBatch } from "../shared/util";
import { teams, teamMembers } from "../seed/teams";
import * as apig from "aws-cdk-lib/aws-apigateway";
import { Construct } from 'constructs';
import * as node from "aws-cdk-lib/aws-lambda-nodejs";

type AppApiProps = {
  userPoolId: string;
  userPoolClientId: string;
};

export class CA1API extends Construct {
  constructor(scope: Construct, id: string, props: AppApiProps) {
    super(scope, id);

    const CA1api = new apig.RestApi(this, "CA1 REST API", {
      description: "CA1 API",
      endpointTypes: [apig.EndpointType.REGIONAL],
      deployOptions: {
        stageName: "dev",
      },
      defaultCorsPreflightOptions: {
        allowHeaders: ["Content-Type", "X-Amz-Date"],
        allowMethods: ["OPTIONS", "GET", "POST", "PUT", "PATCH", "DELETE"],
        allowCredentials: true,
        allowOrigins: ["*"],
      },
    });

    const appCommonFnProps = {
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: "handler",
      environment: {
        USER_POOL_ID: props.userPoolId,
        CLIENT_ID: props.userPoolClientId
      },
    };

    ///////////////////////////////////
    //            tables            //
    //////////////////////////////////

    const teamsTable = new dynamodb.Table(this, "TeamsTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "id", type: dynamodb.AttributeType.NUMBER },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "Teams",
    });

    const teamMembersTable = new dynamodb.Table(this, "TeamMembersTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "teamId", type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: "memberName", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "TeamMembers",
    });

    teamMembersTable.addLocalSecondaryIndex({
      indexName: "roleIx",
      sortKey: { name: "memberPosition", type: dynamodb.AttributeType.STRING },
    });


    ////////////////////////////////////
    //            functions           //
    ////////////////////////////////////
    
    const getTeamByIdFn = new lambdanode.NodejsFunction(
      this,
      "GetTeamByIdFn",
      {
        ...appCommonFnProps,
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: `${__dirname}/../lambdas/getTeamById.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          TABLE_NAME: teamsTable.tableName,
          MEMBERS_TABLE_NAME: teamMembersTable.tableName,
          REGION: 'eu-west-1',
        },
      }
    );

    const getAllTeamsFn = new lambdanode.NodejsFunction(
      this,
      "GetAllTeamsFn",
      {
        ...appCommonFnProps,
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: `${__dirname}/../lambdas/getAllTeams.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          TABLE_NAME: teamsTable.tableName,
          REGION: 'eu-west-1',
        },
      }
    );

    const newTeamFn = new lambdanode.NodejsFunction(this, "AddTeamFn", {
      ...appCommonFnProps,
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: `${__dirname}/../lambdas/addTeam.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: teamsTable.tableName,
        REGION: "eu-west-1",
      },
    });

    const updateTeamFn = new lambdanode.NodejsFunction(this, "UpdateTeamFn", {
      ...appCommonFnProps,
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: `${__dirname}/../lambdas/updateTeam.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: teamsTable.tableName,
        REGION: "eu-west-1",
      },
    });

    const deleteTeamFn = new lambdanode.NodejsFunction(this, "DeleteTeamFn", {
      ...appCommonFnProps,
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/deleteTeam.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: teamsTable.tableName,
        REGION: "eu-west-1",
      },
    });

    const getTeamMembersFn = new lambdanode.NodejsFunction(
      this,
      "GetTeamMember.Fn",
      {
        ...appCommonFnProps,
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_16_X,
        entry: `${__dirname}/../lambdas/getTeamMember.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          MEMBERS_TABLE_NAME: teamMembersTable.tableName,
          REGION: "eu-west-1",
        },
      }
    );

    const authorizerFn = new node.NodejsFunction(this, "AuthorizerFn", {
      ...appCommonFnProps,
      entry: "./lambdas/auth/authorizer.ts",
    });

    const requestAuthorizer = new apig.RequestAuthorizer(
      this,
      "RequestAuthorizer",
      {
        identitySources: [apig.IdentitySource.header("cookie")],
        handler: authorizerFn,
        resultsCacheTtl: cdk.Duration.minutes(0),
      }
    );

    new custom.AwsCustomResource(this, "teamsddbInitData", {
      onCreate: {
        service: "DynamoDB",
        action: "batchWriteItem",
        parameters: {
          RequestItems: {
            [teamsTable.tableName]: generateBatch(teams),
            [teamMembersTable.tableName]: generateBatch(teamMembers)
          }
        },
        physicalResourceId: custom.PhysicalResourceId.of("teamsddbInitData")
      },
      policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [teamsTable.tableArn, teamMembersTable.tableArn],
      }),
    });


    //////////////////////////////////////
    //            Permissions           //
    ////////////////////////////////////// 
    
    teamsTable.grantReadData(getAllTeamsFn)
    teamsTable.grantReadData(getTeamByIdFn)
    teamMembersTable.grantReadData(getTeamByIdFn)
    teamMembersTable.grantReadData(getTeamMembersFn)
    teamsTable.grantReadWriteData(newTeamFn)
    teamsTable.grantReadWriteData(deleteTeamFn);
    teamsTable.grantReadWriteData(updateTeamFn)

   
    ////////////////////////////////
    //          REST API          // 
    ////////////////////////////////

    const teamsEndpoint = CA1api.root.addResource("teams");
    teamsEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getAllTeamsFn, { proxy: true })
    );

    const teamEndpoint = teamsEndpoint.addResource("{id}");
    teamEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getTeamByIdFn, { proxy: true })
    );

    teamsEndpoint.addMethod(
      "POST",
      new apig.LambdaIntegration(newTeamFn, { proxy: true }),
      {
        authorizer: requestAuthorizer,
        authorizationType: apig.AuthorizationType.CUSTOM,
      }
    );

    
    teamEndpoint.addMethod(
      "PUT",
      new apig.LambdaIntegration(updateTeamFn, { proxy: true }),
      {
        authorizer: requestAuthorizer,
        authorizationType: apig.AuthorizationType.CUSTOM,
      }
    );

    teamEndpoint.addMethod(
      "DELETE",
      new apig.LambdaIntegration(deleteTeamFn, { proxy: true }),
      {
        authorizer: requestAuthorizer,
        authorizationType: apig.AuthorizationType.CUSTOM,
      }
    );

    const teamMembersEndpoint = teamsEndpoint.addResource("members");
    teamMembersEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getTeamMembersFn, { proxy: true })
    );
  }
}