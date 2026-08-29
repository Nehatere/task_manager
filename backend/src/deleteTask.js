const { DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient, response } = require("./dynamoClient");

const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
  try {
    const taskId = event.pathParameters && event.pathParameters.taskId;
    if (!taskId) {
      return response(400, { error: "taskId is required in the path" });
    }

    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { taskId },
      })
    );

    return response(200, { message: "Task deleted", taskId });
  } catch (err) {
    console.error("deleteTask error:", err);
    return response(500, { error: "Could not delete task" });
  }
};
