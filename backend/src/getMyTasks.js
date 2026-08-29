const { ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient, response } = require("./dynamoClient");
const { authenticate } = require("./auth");

const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async event => {
  try {
    const user = await authenticate(event);

    if (!user) {
      return response(401, {
        error: "Login required"
      });
    }

    if (user.role !== "employee") {
      return response(403, {
        error: "Employee access required"
      });
    }

    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: "assignedTo = :username",
        ExpressionAttributeValues: {
          ":username": user.username
        }
      })
    );

    const tasks = result.Items || [];

    tasks.sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : -1
    );

    return response(200, {
      tasks
    });

  } catch (err) {
    console.error("getMyTasks:", err);

    return response(500, {
      error: "Could not load employee tasks"
    });
  }
};
