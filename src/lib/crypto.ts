import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const STATIC_SALT = "freckle-console-v1";

function getSalt(): string {
  // Use FRECKLE_ENCRYPTION_SALT env var for per-deployment unique salt.
  // Falls back to static salt for backward compatibility with existing encrypted data.
  return process.env.FRECKLE_ENCRYPTION_SALT || STATIC_SALT;
}

function deriveKey(salt: string): Buffer {
  const key = process.env.FRECKLE_ENCRYPTION_KEY;
  if (!key || key.length < 16) {
    throw new Error("FRECKLE_ENCRYPTION_KEY must be at least 16 characters");
  }
  return scryptSync(key, salt, 32);
}

function getKey(): Buffer {
  return deriveKey(getSalt());
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

function decryptWithSalt(token: string, salt: string): string {
  const parts = token.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format");
  }
  const [ivB64, authTagB64, encryptedB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const encrypted = Buffer.from(encryptedB64, "base64");

  if (iv.length !== 16) {
    throw new Error("Invalid IV length");
  }
  if (authTag.length !== 16) {
    throw new Error("Invalid auth tag length");
  }

  const decipher = createDecipheriv(ALGORITHM, deriveKey(salt), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf-8");
}

export function decrypt(token: string): string {
  const currentSalt = getSalt();
  // Try with current salt first
  try {
    return decryptWithSalt(token, currentSalt);
  } catch {
    // If current salt differs from static, try static salt for backward compat
    if (currentSalt !== STATIC_SALT) {
      return decryptWithSalt(token, STATIC_SALT);
    }
    throw new Error("Decryption failed");
  }
}
