const {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand
} = require("@aws-sdk/client-cognito-identity-provider");

const { response } = require("./dynamoClient");

const client = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION
});

const USER_POOL_ID = process.env.USER_POOL_ID;

exports.handler = async event => {
  try {
    const claims =
      event.requestContext &&
      event.requestContext.authorizer &&
      event.requestContext.authorizer.claims;

    const groups = claims && claims["cognito:groups"]
      ? claims["cognito:groups"].split(",")
      : [];

    if (!groups.includes("Admins")) {
      return response(403, {
        error: "Admin access required"
      });
    }

    const body = JSON.parse(event.body || "{}");

    const name = String(body.name || "").trim();
    const username = String(body.username || "").trim();
    const email = String(body.email || "").trim();
    const password = String(body.password || "");

    if (!name || !username || !email || !password) {
      return response(400, {
        error: "Name, username, email and password are required"
      });
    }

    if (username.length < 3) {
      return response(400, {
        error: "Username must be at least 3 characters"
      });
    }

    if (password.length < 8) {
      return response(400, {
        error: "Password must be at least 8 characters"
      });
    }

    await client.send(
      new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
        MessageAction: "SUPPRESS",
        UserAttributes: [
          {
            Name: "email",
            Value: email
          },
          {
            Name: "email_verified",
            Value: "true"
          },
          {
            Name: "name",
            Value: name
          }
        ]
      })
    );

    await client.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
        Password: password,
        Permanent: true
      })
    );

    return response(201, {
      message: "Team member created successfully",
      member: {
        name,
        username,
        email
      }
    });

  } catch (err) {
    console.error("createTeamMember error:", err);

    if (err.name === "UsernameExistsException") {
      return response(409, {
        error: "Username already exists"
      });
    }

    if (err.name === "InvalidPasswordException") {
      return response(400, {
        error: "Password does not meet Cognito password requirements"
      });
    }

    if (err.name === "InvalidParameterException") {
      return response(400, {
        error: err.message
      });
    }

    return response(500, {
      error: "Could not create team member"
    });
  }
};
