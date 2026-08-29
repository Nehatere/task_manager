const crypto = require("crypto");

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");

  return {
    salt,
    hash
  };
}

function verifyPassword(password, salt, storedHash) {
  const hash = crypto.scryptSync(password, salt, 64);

  const stored = Buffer.from(storedHash, "hex");

  if (hash.length !== stored.length) {
    return false;
  }

  return crypto.timingSafeEqual(hash, stored);
}

module.exports = {
  hashPassword,
  verifyPassword
};
