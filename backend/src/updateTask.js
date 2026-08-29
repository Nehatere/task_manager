const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient, response } = require("./dynamoClient");

const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
  try {
    const taskId = event.pathParameters && event.pathParameters.taskId;
    if (!taskId) {
      return response(400, { error: "taskId is required in the path" });
    }

    const body = JSON.parse(event.body || "{}");
    const { title, description, priority, done } = body;

    // Build the update expression dynamically so a request can update
    // just one field (e.g. only "done") without clobbering the rest.
    const updates = [];
    const names = {};
    const values = {};

    if (title !== undefined) {
      updates.push("#title = :title");
      names["#title"] = "title";
      values[":title"] = title;
    }
    if (description !== undefined) {
      updates.push("description = :description");
      values[":description"] = description;
    }
    if (priority !== undefined) {
      updates.push("priority = :priority");
      values[":priority"] = priority;
    }
    if (done !== undefined) {
      updates.push("done = :done");
      values[":done"] = Boolean(done);
    }

    if (updates.length === 0) {
      return response(400, { error: "No updatable fields provided" });
    }

    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { taskId },
        UpdateExpression: "SET " + updates.join(", "),
        ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
        ExpressionAttributeValues: values,
        ReturnValues: "ALL_NEW",
      })
    );

    return response(200, result.Attributes);
  } catch (err) {
    console.error("updateTask error:", err);
    return response(500, { error: "Could not update task" });
  }
};
