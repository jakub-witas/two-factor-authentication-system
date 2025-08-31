const { randomBytes, createCipheriv, createDecipheriv } = require("crypto");

const SECRET_KEY = process.env.SECRET_KEY || "super_secret_32_bytes_long_key!"; 
const IV_LENGTH = 16; // AES block size

function encryptSecret(secret) {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-cbc", Buffer.from(SECRET_KEY), iv);

  let encrypted = cipher.update(secret, "utf8", "hex");
  encrypted += cipher.final("hex");

  return iv.toString("hex") + ":" + encrypted;
}

function decryptSecret(encryptedSecret) {
  if (!encryptedSecret) return null;

  const [ivHex, encrypted] = encryptedSecret.split(":");
  const iv = Buffer.from(ivHex, "hex");

  const decipher = createDecipheriv("aes-256-cbc", Buffer.from(SECRET_KEY), iv);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

module.exports = { encryptSecret, decryptSecret };
