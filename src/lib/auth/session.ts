import { EncryptJWT, jwtDecrypt } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "freckle_session";
const EXPIRY_DAYS = 7;

function getSecret(): Uint8Array {
  const secret = process.env.FRECKLE_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("FRECKLE_SESSION_SECRET must be at least 32 characters");
  }
  return new TextEncoder().encode(secret.slice(0, 32));
}

export async function createSession(): Promise<void> {
  const secret = getSecret();
  const token = await new EncryptJWT({ role: "admin" })
    .setProtectedHeader({ alg: "dir", enc: "A128CBC-HS256" })
    .setIssuedAt()
    .setIssuer("freckle")
    .setExpirationTime(`${EXPIRY_DAYS}d`)
    .encrypt(secret);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: EXPIRY_DAYS * 24 * 60 * 60,
  });
}

export async function verifySession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;

  try {
    const secret = getSecret();
    const { payload } = await jwtDecrypt(token, secret, {
      issuer: "freckle",
    });
    return payload.role === "admin";
  } catch {
    return false;
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
