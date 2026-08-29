const {
  GetCommand,
  UpdateCommand
} = require("@aws-sdk/lib-dynamodb");

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

    const taskId = event.pathParameters?.taskId;

    if (!taskId) {
      return response(400, {
        error: "Task ID is required"
      });
    }

    const body = JSON.parse(event.body || "{}");
    const status = body.status;

    const validStatuses = [
      "todo",
      "in-progress",
      "completed"
    ];

    if (!validStatuses.includes(status)) {
      return response(400, {
        error: "Invalid status"
      });
    }

    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { taskId }
      })
    );

    const task = result.Item;

    if (!task) {
      return response(404, {
        error: "Task not found"
      });
    }

    if (
      String(task.assignedTo || "").toLowerCase() !==
      String(user.username).toLowerCase()
    ) {
      return response(403, {
        error: "You cannot update this task"
      });
    }

    const updated = await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { taskId },
        UpdateExpression: "SET #status = :status",
        ExpressionAttributeNames: {
          "#status": "status"
        },
        ExpressionAttributeValues: {
          ":status": status
        },
        ReturnValues: "ALL_NEW"
      })
    );

    return response(200, {
      message: "Task status updated",
      task: updated.Attributes
    });

  } catch (err) {
    console.error("updateMyTaskStatus:", err);

    return response(500, {
      error: "Could not update task status"
    });
  }
};
