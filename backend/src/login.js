const crypto = require("crypto");
const { GetCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient, response } = require("./dynamoClient");
const { verifyPassword } = require("./password");
const { hashToken } = require("./auth");

const USERS_TABLE_NAME = process.env.USERS_TABLE_NAME;
const SESSIONS_TABLE_NAME = process.env.SESSIONS_TABLE_NAME;

exports.handler = async event => {
  try {
    const body = JSON.parse(event.body || "{}");

    const username = String(body.username || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!username || !password) {
      return response(400, {
        error: "Username and password are required"
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
      return response(401, {
        error: "Invalid username or password"
      });
    }

    const valid = verifyPassword(
      password,
      user.passwordSalt,
      user.passwordHash
    );

    if (!valid) {
      return response(401, {
        error: "Invalid username or password"
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);

    const expiresAt =
      Date.now() + 8 * 60 * 60 * 1000;

    await docClient.send(
      new PutCommand({
        TableName: SESSIONS_TABLE_NAME,
        Item: {
          tokenHash,
          username,
          expiresAt,
          createdAt: new Date().toISOString()
        }
      })
    );

    return response(200, {
      token,
      user: {
        username: user.username,
        name: user.name,
        role: user.role
      }
    });

  } catch (err) {
    console.error("login:", err);

    return response(500, {
      error: "Login failed"
    });
  }
};
