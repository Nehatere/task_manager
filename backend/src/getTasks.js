const { ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient, response } = require("./dynamoClient");

const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async () => {
  try {
    // Scan is fine here: this is a small personal task list, not a
    // high-traffic table, so we don't need a Query + GSI for this.
    const result = await docClient.send(
      new ScanCommand({ TableName: TABLE_NAME })
    );

    const tasks = result.Items || [];

    // Summary is calculated here from the actual data on every fetch,
    // never stored as a separate hand-maintained counter.
    const summary = {
      total: tasks.length,
      done: tasks.filter((t) => t.done).length,
      pending: tasks.filter((t) => !t.done).length,
    };

    // Sort newest first for a stable, sensible display order.
    tasks.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    return response(200, { tasks, summary });
  } catch (err) {
    console.error("getTasks error:", err);
    return response(500, { error: "Could not fetch tasks" });
  }
};
