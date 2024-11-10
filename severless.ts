import type { AWS } from '@serverless/typescript';

const serverlessConfiguration: AWS = {
  service: 'translate-service',

  frameworkVersion: '2',

  plugins: ['serverless-offline'], 

  provider: {
    name: 'aws',
    runtime: 'nodejs16.x',  
    region: 'us-west-1',
    iamRoleStatements: [
        {
            Effect: 'Allow',
            Action: ['translate:*'],
            Resource: '*',
        },
    ],
  },

  functions: {
    translate: {
      handler: 'lambdas/translate.handler', 
      events: [
        {
          http: {
            path: 'translate',
            method: 'POST',
            cors: true,
            },
        },
      ],
    },
  },

};

module.exports = serverlessConfiguration;
