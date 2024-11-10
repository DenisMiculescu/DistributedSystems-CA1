import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { UserPool } from "aws-cdk-lib/aws-cognito";
import { AuthApi } from './auth-api'
import {CA1API } from './app-api'

export class Ca1Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const userPool = new UserPool(this, "UserPool", {
      signInAliases: { username: true, email: true },
      selfSignUpEnabled: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const userPoolId = userPool.userPoolId;

    const appClient = userPool.addClient("AppClient", {
      authFlows: { userPassword: true },
    });

    const userPoolClientId = appClient.userPoolClientId;

    new AuthApi(this, 'AuthServiceApi', {
      userPoolId: userPoolId,
      userPoolClientId: userPoolClientId,
    });

    new CA1API(this, 'CA1API', {
      userPoolId: userPoolId,
      userPoolClientId: userPoolClientId,
    } );
  } 
}