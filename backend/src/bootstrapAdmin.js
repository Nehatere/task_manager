const { ScanCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient, response } = require("./dynamoClient");
const { hashPassword } = require("./password");

const USERS_TABLE_NAME = process.env.USERS_TABLE_NAME;

exports.handler = async event => {
  try {
    const existing = await docClient.send(
      new ScanCommand({
        TableName: USERS_TABLE_NAME
      })
    );

    const hasAdmin = (existing.Items || []).some(
      user => user.role === "admin"
    );

    if (hasAdmin) {
      return response(409, {
        error: "Admin account already exists"
      });
    }

    const body = JSON.parse(event.body || "{}");

    const username = String(body.username || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const password = String(body.password || "");

    if (!username || !name || !password) {
      return response(400, {
        error: "Username, name and password are required"
      });
    }

    if (password.length < 8) {
      return response(400, {
        error: "Password must contain at least 8 characters"
      });
    }

    const passwordData = hashPassword(password);

    await docClient.send(
      new PutCommand({
        TableName: USERS_TABLE_NAME,
        Item: {
          username,
          name,
          email,
          role: "admin",
          passwordHash: passwordData.hash,
          passwordSalt: passwordData.salt,
          createdAt: new Date().toISOString()
        },
        ConditionExpression: "attribute_not_exists(username)"
      })
    );

    return response(201, {
      message: "Admin account created",
      username
    });

  } catch (err) {
    console.error("bootstrapAdmin:", err);

    return response(500, {
      error: "Could not create admin"
    });
  }
};
