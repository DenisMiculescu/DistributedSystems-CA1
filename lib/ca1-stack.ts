import * as cdk from 'aws-cdk-lib';
import * as lambdanode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import { generateBatch } from "../shared/util";
import { teams, teamMembers } from "../seed/teams";
import * as apig from "aws-cdk-lib/aws-apigateway";
import { Construct } from 'constructs';
import { UserPool } from "aws-cdk-lib/aws-cognito";
import * as iam from "aws-cdk-lib/aws-iam";
import * as node from "aws-cdk-lib/aws-lambda-nodejs";

export class Ca1Stack extends cdk.Stack {

  private auth: apig.IResource;
  private userPoolId: string;
  private userPoolClientId: string;
  
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);


    //////////////////////////////////
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

    const deleteTeamFn = new lambdanode.NodejsFunction(this, "DeleteTeamFn", {
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

    // const getTeamByIdURL = getTeamByIdFn.addFunctionUrl({
    //   authType: lambda.FunctionUrlAuthType.NONE,
    //   cors: {
    //     allowedOrigins: ["*"],
    //   }
    // });

    // const getAllTeamsURL = getAllTeamsFn.addFunctionUrl({
    //   authType: lambda.FunctionUrlAuthType.NONE,
    //   cors: {
    //     allowedOrigins: ["*"],
    //   }
    // })

    // const getTeamMemberURL = getTeamMembersFn.addFunctionUrl({
    //   authType: lambda.FunctionUrlAuthType.NONE,
    //   cors: {
    //     allowedOrigins: ["*"],
    //   },
    // });


    //////////////////////////////////////
    //            Permissions           //
    ////////////////////////////////////// 
    
    teamsTable.grantReadData(getAllTeamsFn)
    teamsTable.grantReadData(getTeamByIdFn)
    teamMembersTable.grantReadData(getTeamByIdFn)
    teamMembersTable.grantReadData(getTeamMembersFn)
    teamsTable.grantReadWriteData(newTeamFn)
    teamsTable.grantReadWriteData(deleteTeamFn);

    // new cdk.CfnOutput(this, "Get Teams Function Url", { value: getTeamByIdURL.url });
    // new cdk.CfnOutput(this, "Get All Teams Url", { value: getAllTeamsURL.url });
    // new cdk.CfnOutput(this, "Get Team Members Url", { value: getTeamMemberURL.url });


    ////////////////////////////////
    //          REST API          // 
    ////////////////////////////////

    const CA1api = new apig.RestApi(this, "CA1 REST API", {
      description: "CA1 API",
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
      new apig.LambdaIntegration(newTeamFn, { proxy: true })
    );

    teamEndpoint.addMethod(
      "DELETE",
      new apig.LambdaIntegration(deleteTeamFn, { proxy: true })
    );

    const teamMembersEndpoint = teamsEndpoint.addResource("members");
    teamMembersEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getTeamMembersFn, { proxy: true })
    );


    //////////////////////////////////////////
    //            Authentication            //
    //////////////////////////////////////////

    const userPool = new UserPool(this, "UserPool", {
      signInAliases: { username: true, email: true },
      selfSignUpEnabled: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.userPoolId = userPool.userPoolId;

    const appClient = userPool.addClient("AppClient", {
      authFlows: { userPassword: true },
    });

    this.userPoolClientId = appClient.userPoolClientId;

    const authApi = new apig.RestApi(this, "AuthServiceApi", {
      description: "Authentication Service RestApi",
      endpointTypes: [apig.EndpointType.REGIONAL],
      defaultCorsPreflightOptions: {
        allowOrigins: apig.Cors.ALL_ORIGINS,
      },
    });

    this.auth = authApi.root.addResource("auth");

  }
  
  private addAuthRoute(
    resourceName: string,
    method: string,
    fnName: string,
    fnEntry: string,
    allowCognitoAccess?: boolean
  ): void {
    const commonFnProps = {
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "handler",
      environment: {
        USER_POOL_ID: this.userPoolId,
        CLIENT_ID: this.userPoolClientId,
        REGION: cdk.Aws.REGION
      },
    };
    
    const resource = this.auth.addResource(resourceName);
    
    const fn = new node.NodejsFunction(this, fnName, {
      ...commonFnProps,
      entry: `${__dirname}/../lambda/auth/${fnEntry}`,
    });

    resource.addMethod(method, new apig.LambdaIntegration(fn));
  } 
}