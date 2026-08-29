const { GetCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
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

    const username = decodeURIComponent(
      event.pathParameters?.username || ""
    ).trim().toLowerCase();

    if (!username) {
      return response(400, {
        error: "Username is required"
      });
    }

    const result = await docClient.send(
      new GetCommand({
        TableName: USERS_TABLE_NAME,
        Key: { username }
      })
    );

    const user = result.Item;

    if (!user) {
      return response(404, {
        error: "Employee not found"
      });
    }

    if (user.role !== "employee") {
      return response(403, {
        error: "Only employee accounts can be removed"
      });
    }

    await docClient.send(
      new DeleteCommand({
        TableName: USERS_TABLE_NAME,
        Key: { username }
      })
    );

    return response(200, {
      message: "Employee removed successfully"
    });

  } catch (err) {
    console.error("deleteTeamMember:", err);

    return response(500, {
      error: "Could not remove employee"
    });
  }
};
