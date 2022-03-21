import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import AWS from "aws-sdk";
import { v4 } from "uuid";
import * as yup from "yup";

const docClient = new AWS.DynamoDB.DocumentClient();
const tableName = "UsersTable";
const headers = {
  "content-type": "application/json",
};

const schema = yup.object().shape({
  firstName: yup.string().required(),
  middleInitial: yup.string().required(),
  lastName: yup.string().required(),
  gender: yup.string().required(),
  email: yup.string().required(),
  phoneNumber: yup.string().required(),
});

class HttpError extends Error {
  constructor(public statusCode: number, body: Record<string, unknown> = {}) {
    super(JSON.stringify(body));
  }
}

const handleError = (e: unknown) => {
  if (e instanceof yup.ValidationError) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        errors: e.errors,
      }),
    };
  }

  if (e instanceof SyntaxError) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: `invalid request body format : "${e.message}"` }),
    };
  }

  if (e instanceof HttpError) {
    return {
      statusCode: e.statusCode,
      headers,
      body: e.message,
    };
  }

  throw e;
};

export const hello = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: "Go Serverless v1.0! Your function executed successfully!",
        input: event,
      },
      null,
      2,
    ),
  };
};

const fetchUserById = async (id: string) => {
  const output = await docClient
    .get({
      TableName: tableName,
      Key: {
        userID: id,
      },
    })
    .promise();

  if (!output.Item) {
    throw new HttpError(404, { error: "not found" });
  }

  return output.Item;
};

export const createUser = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const reqBody = JSON.parse(event.body as string);

    await schema.validate(reqBody, { abortEarly: false });

    const user = {
      ...reqBody,
      userID: v4(),
    };

    await docClient
      .put({
        TableName: tableName,
        Item: user,
      })
      .promise();

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify(user),
    };
  } catch (e) {
    return handleError(e);
  }
};

export const getUser = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const user = await fetchUserById(event.pathParameters?.id as string);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(user),
    };
  } catch (e) {
    return handleError(e);
  }
};


export const updateUser = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const id = event.pathParameters?.id as string;

    await fetchUserById(id);

    const reqBody = JSON.parse(event.body as string);

    await schema.validate(reqBody, { abortEarly: false });

    const user = {
      ...reqBody,
      userID: id,
    };

    await docClient
      .put({
        TableName: tableName,
        Item: user,
      })
      .promise();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(user),
    };
  } catch (e) {
    return handleError(e);
  }
};