const { PutCommand } = require("@aws-sdk/lib-dynamodb");
const { randomUUID } = require("crypto");
const { docClient, response } = require("./dynamoClient");

const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { title, description, priority } = body;

    if (!title || !title.trim()) {
      return response(400, { error: "Title is required" });
    }

    const task = {
      taskId: randomUUID(),
      title: title.trim(),
      description: description ? description.trim() : "",
      priority: ["low", "medium", "high"].includes(priority) ? priority : "medium",
      done: false,
      createdAt: new Date().toISOString(),
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: task,
      })
    );

    return response(201, task);
  } catch (err) {
    console.error("createTask error:", err);
    return response(500, { error: "Could not create task" });
  }
};
