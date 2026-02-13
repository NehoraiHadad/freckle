"use server";

import { timingSafeEqual } from "crypto";
import { createSession, destroySession } from "@/lib/auth/session";
import { getPreference } from "@/lib/db/preferences";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

// In-memory rate limiter: IP -> { count, resetAt }
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > MAX_ATTEMPTS;
}

function constantTimeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");
  if (bufA.length !== bufB.length) {
    // Compare against self to consume constant time, then return false
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export async function login(
  _prevState: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const t = await getTranslations("auth");
  const password = formData.get("password") as string;

  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  if (isRateLimited(ip)) {
    return { error: t("rateLimited") };
  }

  const adminPassword = process.env.FRECKLE_ADMIN_PASSWORD;
  if (!adminPassword) {
    return { error: t("serverConfigError") };
  }

  if (!constantTimeCompare(password, adminPassword)) {
    return { error: t("invalidPassword") };
  }

  await createSession();

  // Check for returnTo redirect (from auth middleware)
  const returnTo = formData.get("returnTo") as string | null;
  if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    redirect(returnTo);
  }

  const defaultProduct = getPreference("defaultProduct");
  if (defaultProduct) {
    redirect(`/p/${defaultProduct}`);
  }
  redirect("/");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
