const { DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient, response } = require("./dynamoClient");
const { hashToken } = require("./auth");

const SESSIONS_TABLE_NAME = process.env.SESSIONS_TABLE_NAME;

exports.handler = async event => {
  try {
    const authorization =
      event.headers?.Authorization ||
      event.headers?.authorization;

    if (!authorization || !authorization.startsWith("Bearer ")) {
      return response(401, {
        error: "Login required"
      });
    }

    const token = authorization.substring(7).trim();

    if (!token) {
      return response(401, {
        error: "Login required"
      });
    }

    await docClient.send(
      new DeleteCommand({
        TableName: SESSIONS_TABLE_NAME,
        Key: {
          tokenHash: hashToken(token)
        }
      })
    );

    return response(200, {
      message: "Logged out successfully"
    });

  } catch (err) {
    console.error("logout:", err);

    return response(500, {
      error: "Could not log out"
    });
  }
};
