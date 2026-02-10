/**
 * One-time migration: re-encrypt API keys from old KDF (Buffer.from slice)
 * to new KDF (scryptSync).
 *
 * Usage: node scripts/migrate-encryption.mjs
 */

import Database from "better-sqlite3";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Manually load .env.local
const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const [, k, v] = match;
    process.env[k.trim()] = v.trim();
  }
}

const ALGORITHM = "aes-256-gcm";
const key = process.env.FRECKLE_ENCRYPTION_KEY;

if (!key || key.length < 16) {
  console.error("FRECKLE_ENCRYPTION_KEY must be set and at least 16 characters");
  process.exit(1);
}

// Old key derivation (what was used before)
function getOldKey() {
  return Buffer.from(key.slice(0, 32), "utf-8");
}

// New key derivation (scryptSync)
function getNewKey() {
  return scryptSync(key, "freckle-console-v1", 32);
}

function decryptOld(token) {
  const [ivB64, authTagB64, encryptedB64] = token.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const encrypted = Buffer.from(encryptedB64, "base64");
  const decipher = createDecipheriv(ALGORITHM, getOldKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf-8");
}

function encryptNew(plaintext) {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, getNewKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

// Open database
const dbPath = path.join(__dirname, "..", "data", "freckle.db");
const db = new Database(dbPath);

const rows = db.prepare("SELECT id, api_key FROM products").all();

if (rows.length === 0) {
  console.log("No products found in database. Nothing to migrate.");
  process.exit(0);
}

console.log(`Found ${rows.length} product(s) to migrate...`);

let migrated = 0;
let failed = 0;

for (const row of rows) {
  try {
    const plaintext = decryptOld(row.api_key);
    const newCiphertext = encryptNew(plaintext);
    db.prepare("UPDATE products SET api_key = ? WHERE id = ?").run(newCiphertext, row.id);
    console.log(`  ✓ ${row.id} — re-encrypted successfully`);
    migrated++;
  } catch (err) {
    console.error(`  ✗ ${row.id} — failed: ${err.message}`);
    failed++;
  }
}

db.close();

console.log(`\nDone. Migrated: ${migrated}, Failed: ${failed}`);
if (failed > 0) {
  console.log("Failed products will need to be re-registered manually.");
  process.exit(1);
}
