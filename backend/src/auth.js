const crypto = require("crypto");
const { GetCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("./dynamoClient");

const USERS_TABLE_NAME = process.env.USERS_TABLE_NAME;
const SESSIONS_TABLE_NAME = process.env.SESSIONS_TABLE_NAME;

function hashToken(token) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

async function authenticate(event) {
  const authorization =
    event.headers?.Authorization ||
    event.headers?.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.substring(7).trim();

  if (!token) {
    return null;
  }

  const tokenHash = hashToken(token);

  const sessionResult = await docClient.send(
    new GetCommand({
      TableName: SESSIONS_TABLE_NAME,
      Key: { tokenHash }
    })
  );

  const session = sessionResult.Item;

  if (!session) {
    return null;
  }

  if (Date.now() > Number(session.expiresAt)) {
    return null;
  }

  const userResult = await docClient.send(
    new GetCommand({
      TableName: USERS_TABLE_NAME,
      Key: {
        username: session.username
      }
    })
  );

  return userResult.Item || null;
}

module.exports = {
  authenticate,
  hashToken
};
