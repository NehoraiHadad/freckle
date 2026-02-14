"use server";

import { z } from "zod";
import { timingSafeEqual } from "crypto";
import { createSession, destroySession } from "@/lib/auth/session";
import { getPreference } from "@/lib/db/preferences";
import { getDb } from "@/lib/db";
import { appendLog } from "@/lib/db/audit-log";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const loginSchema = z.object({
  password: z.string().min(1),
});

function isRateLimited(ip: string): boolean {
  const db = getDb();
  const now = Date.now();
  const row = db
    .prepare(
      "SELECT attempts, blocked_until FROM login_attempts WHERE ip = ?",
    )
    .get(ip) as
    | { attempts: number; blocked_until: number | null }
    | undefined;
  if (!row) return false;
  if (row.blocked_until && now < row.blocked_until) return true;
  return false;
}

function recordLoginAttempt(ip: string, success: boolean): void {
  const db = getDb();
  const now = Date.now();

  if (success) {
    db.prepare("DELETE FROM login_attempts WHERE ip = ?").run(ip);
    return;
  }

  const row = db
    .prepare("SELECT attempts, last_attempt FROM login_attempts WHERE ip = ?")
    .get(ip) as { attempts: number; last_attempt: number } | undefined;

  if (!row || now - row.last_attempt > WINDOW_MS) {
    db.prepare(
      "INSERT OR REPLACE INTO login_attempts (ip, attempts, last_attempt, blocked_until) VALUES (?, 1, ?, NULL)",
    ).run(ip, now);
  } else {
    const newAttempts = row.attempts + 1;
    const blockedUntil =
      newAttempts >= MAX_ATTEMPTS ? now + BLOCK_DURATION_MS : null;
    db.prepare(
      "UPDATE login_attempts SET attempts = ?, last_attempt = ?, blocked_until = ? WHERE ip = ?",
    ).run(newAttempts, now, blockedUntil, ip);
  }
}

function cleanupStaleAttempts(): void {
  const db = getDb();
  const cutoff = Date.now() - WINDOW_MS * 2;
  db.prepare("DELETE FROM login_attempts WHERE last_attempt < ?").run(cutoff);
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

  const parsed = loginSchema.safeParse({
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: t("invalidPassword") };
  }
  const { password } = parsed.data;

  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  // Periodic cleanup of stale rate limit entries
  cleanupStaleAttempts();

  if (isRateLimited(ip)) {
    return { error: t("rateLimited") };
  }

  const adminPassword = process.env.FRECKLE_ADMIN_PASSWORD;
  if (!adminPassword) {
    return { error: t("serverConfigError") };
  }

  if (!constantTimeCompare(password, adminPassword)) {
    recordLoginAttempt(ip, false);
    appendLog({
      productId: "system",
      action: "auth.login_failed",
      result: "error",
      errorMessage: "Invalid password",
      ipAddress: ip,
    });
    return { error: t("invalidPassword") };
  }

  await createSession();

  recordLoginAttempt(ip, true);
  appendLog({
    productId: "system",
    action: "auth.login",
    result: "success",
    ipAddress: ip,
  });

  // Safe redirect - only allow relative paths
  const returnTo = formData.get("returnTo") as string | null;
  if (returnTo) {
    const isRelative =
      returnTo.startsWith("/") &&
      !returnTo.startsWith("//") &&
      !returnTo.includes(":");
    if (isRelative) {
      try {
        new URL(returnTo, "http://localhost");
        redirect(returnTo);
      } catch {
        // Invalid URL, fall through to default redirect
      }
    }
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
