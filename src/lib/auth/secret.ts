const SECRET_MIN_LENGTH = 32;
const SECRET_BYTE_LENGTH = 32;

export function getSecret(): Uint8Array {
  const secret = process.env.FRECKLE_SESSION_SECRET;
  if (!secret || secret.length < SECRET_MIN_LENGTH) {
    throw new Error("FRECKLE_SESSION_SECRET must be at least 32 characters");
  }
  return new TextEncoder().encode(secret.slice(0, SECRET_BYTE_LENGTH));
}
