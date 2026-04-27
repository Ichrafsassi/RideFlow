# AWS Project - Build a Full End-to-End Web Application with 7 Services | Step-by-Step Tutorial

This repo contains the code files used in this [YouTube video](https://youtu.be/K6v6t5z6AsU).

## TL;DR
We're creating a web application for a unicorn ride-sharing service called RideFlow (from the original [Amazon workshop](https://aws.amazon.com/serverless-workshops)).  The app uses IAM, Amplify, Cognito, Lambda, API Gateway and DynamoDB, with code stored in GitHub and incorporated into a CI/CD pipeline with Amplify.

The app will let you create an account and log in, then request a ride by clicking on a map (powered by ArcGIS).  The code can also be extended to build out more functionality.

## Cost
All services used are eligible for the [AWS Free Tier](https://aws.amazon.com/free/).  Outside of the Free Tier, there may be small charges associated with building the app (less than $1 USD), but charges will continue to incur if you leave the app running.  Please see the end of the YouTube video for instructions on how to delete all resources used in the video.

## The Application Code
The application code is here in this repository.

## The Lambda Function Code
Here is the code for the Lambda function, originally taken from the [AWS workshop](https://aws.amazon.com/getting-started/hands-on/build-serverless-web-app-lambda-apigateway-s3-dynamodb-cognito/module-3/ ), and updated for Node 20.x:

```node
import { randomBytes } from 'crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

// Simulated drivers fleet
const drivers = [
    { Name: 'Adam', Vehicle: 'Sedan', Status: 'Available' },
    { Name: 'Sara', Vehicle: 'SUV', Status: 'Available' },
    { Name: 'Youssef', Vehicle: 'Hatchback', Status: 'Available' },
];

export const handler = async (event, context) => {
    if (!event.requestContext.authorizer) {
        return errorResponse('Authorization not configured', context.awsRequestId);
    }

    const rideId = toUrlString(randomBytes(16));
    console.log('RideFlow Request (', rideId, '): ', event);

    const username = event.requestContext.authorizer.claims['cognito:username'];
    const requestBody = JSON.parse(event.body);
    const pickupLocation = requestBody.PickupLocation;

    const driver = assignDriver(pickupLocation);

    try {
        await recordRide(rideId, username, driver, pickupLocation);

        return {
            statusCode: 201,
            body: JSON.stringify({
                RideId: rideId,
                Driver: driver,
                ETA: '5 minutes',
                User: username,
            }),
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
        };
    } catch (err) {
        console.error(err);
        return errorResponse(err.message, context.awsRequestId);
    }
};

// Assign random driver
function assignDriver(pickupLocation) {
    console.log('Assigning driver for location:', pickupLocation);
    return drivers[Math.floor(Math.random() * drivers.length)];
}

// Store ride in DynamoDB
async function recordRide(rideId, username, driver, pickupLocation) {
    const params = {
        TableName: 'Rides', // make sure matches your DB
        Item: {
            RideId: rideId,
            User: username,
            Driver: driver,
            PickupLocation: pickupLocation,
            RequestTime: new Date().toISOString(),
            Status: 'REQUESTED',
        },
    };

    await ddb.send(new PutCommand(params));
}

// Utility
function toUrlString(buffer) {
    return buffer.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

// Error handler
function errorResponse(errorMessage, awsRequestId) {
    return {
        statusCode: 500,
        body: JSON.stringify({
            Error: errorMessage,
            Reference: awsRequestId,
        }),
        headers: {
            'Access-Control-Allow-Origin': '*',
        },
    };
}
```

## The Lambda Function Test Function
Here is the code used to test the Lambda function:

```json
{
    "path": "/ride",
    "httpMethod": "POST",
    "headers": {
        "Accept": "*/*",
        "Authorization": "eyJraWQiOiJLTzRVMWZs",
        "content-type": "application/json; charset=UTF-8"
    },
    "queryStringParameters": null,
    "pathParameters": null,
    "requestContext": {
        "authorizer": {
            "claims": {
                "cognito:username": "the_username"
            }
        }
    },
    "body": "{\"PickupLocation\":{\"Latitude\":47.6174755835663,\"Longitude\":-122.28837066650185}}"
}
```

