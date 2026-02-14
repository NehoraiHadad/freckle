import { describe, it, expect, vi, beforeEach } from "vitest";

describe("crypto", () => {
  beforeEach(() => {
    vi.stubEnv("FRECKLE_ENCRYPTION_KEY", "test-encryption-key-at-least-16-chars");
    vi.stubEnv("FRECKLE_ENCRYPTION_SALT", "");
    vi.resetModules();
  });

  it("encrypts and decrypts round-trip", async () => {
    const { encrypt, decrypt } = await import("../crypto");
    const plaintext = "hello world";
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertext each time (random IV)", async () => {
    const { encrypt } = await import("../crypto");
    const plaintext = "test";
    const enc1 = encrypt(plaintext);
    const enc2 = encrypt(plaintext);
    expect(enc1).not.toBe(enc2);
  });

  it("handles empty strings", async () => {
    const { encrypt, decrypt } = await import("../crypto");
    const encrypted = encrypt("");
    expect(decrypt(encrypted)).toBe("");
  });

  it("handles unicode", async () => {
    const { encrypt, decrypt } = await import("../crypto");
    const plaintext = "שלום עולם 🌍";
    const encrypted = encrypt(plaintext);
    expect(decrypt(encrypted)).toBe(plaintext);
  });

  it("handles long strings", async () => {
    const { encrypt, decrypt } = await import("../crypto");
    const plaintext = "a".repeat(10000);
    const encrypted = encrypt(plaintext);
    expect(decrypt(encrypted)).toBe(plaintext);
  });

  it("encrypted output has 3 parts separated by colons", async () => {
    const { encrypt } = await import("../crypto");
    const encrypted = encrypt("test");
    const parts = encrypted.split(":");
    expect(parts).toHaveLength(3);
  });

  it("encrypted parts are valid base64", async () => {
    const { encrypt } = await import("../crypto");
    const encrypted = encrypt("test");
    const parts = encrypted.split(":");
    for (const part of parts) {
      expect(() => Buffer.from(part, "base64")).not.toThrow();
      // Verify it's actually base64 (re-encoding should match)
      const decoded = Buffer.from(part, "base64");
      expect(decoded.toString("base64")).toBe(part);
    }
  });

  it("throws on invalid token format", async () => {
    const { decrypt } = await import("../crypto");
    // "invalid" has only 1 part, decrypt catches the inner error and throws "Decryption failed"
    expect(() => decrypt("invalid")).toThrow();
  });

  it("throws on token with wrong number of parts", async () => {
    const { decrypt } = await import("../crypto");
    expect(() => decrypt("a:b")).toThrow();
    expect(() => decrypt("a:b:c:d")).toThrow();
  });
});
