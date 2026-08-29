const { GetCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient, response } = require("./dynamoClient");
const { hashPassword } = require("./password");
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

    const body = JSON.parse(event.body || "{}");

    const name = String(body.name || "").trim();
    const username = String(body.username || "").trim().toLowerCase();
    const email = String(body.email || "").trim();
    const password = String(body.password || "");

    if (!name || !username || !password) {
      return response(400, {
        error: "Name, username and password are required"
      });
    }

    if (password.length < 8) {
      return response(400, {
        error: "Password must contain at least 8 characters"
      });
    }

    const existing = await docClient.send(
      new GetCommand({
        TableName: USERS_TABLE_NAME,
        Key: { username }
      })
    );

    if (existing.Item) {
      return response(409, {
        error: "Username already exists"
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
          role: "employee",
          passwordHash: passwordData.hash,
          passwordSalt: passwordData.salt,
          createdAt: new Date().toISOString()
        }
      })
    );

    return response(201, {
      message: "Employee created successfully",
      member: {
        username,
        name,
        email
      }
    });

  } catch (err) {
    console.error("createTeamMember:", err);

    return response(500, {
      error: "Could not create employee"
    });
  }
};
