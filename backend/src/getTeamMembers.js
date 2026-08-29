const { ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient, response } = require("./dynamoClient");
const { authenticate } = require("./auth");

const USERS_TABLE_NAME = process.env.USERS_TABLE_NAME;

exports.handler = async event => {
  try {
    const admin = await authenticate(event);

    if (!admin || admin.role !== "admin") {
      return response(401, {
        error: "Admin login required"
      });
    }

    const result = await docClient.send(
      new ScanCommand({
        TableName: USERS_TABLE_NAME
      })
    );

    const members = (result.Items || [])
      .filter(user => user.role === "employee")
      .map(user => ({
        username: user.username,
        name: user.name,
        email: user.email || "",
        createdAt: user.createdAt
      }))
      .sort((a, b) =>
        a.name.localeCompare(b.name)
      );

    return response(200, {
      members
    });

  } catch (err) {
    console.error("getTeamMembers:", err);

    return response(500, {
      error: "Could not load team members"
    });
  }
};
