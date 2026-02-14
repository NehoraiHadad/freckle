"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { setPreference } from "@/lib/db/preferences";
import { revalidatePath } from "next/cache";

const preferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  dashboardLayout: z.enum(["grid", "list"]).optional(),
  defaultProduct: z.string().optional(),
  language: z.enum(["en", "he"]).optional(),
});

export async function savePreferences(formData: FormData): Promise<void> {
  const parsed = preferencesSchema.safeParse({
    theme: formData.get("theme") || undefined,
    dashboardLayout: formData.get("dashboardLayout") || undefined,
    defaultProduct: formData.get("defaultProduct") || undefined,
    language: formData.get("language") || undefined,
  });

  if (!parsed.success) {
    return; // silently ignore invalid preferences
  }

  const { theme, dashboardLayout, defaultProduct, language } = parsed.data;

  if (theme) {
    setPreference("theme", theme);
  }

  if (dashboardLayout) {
    setPreference("dashboardLayout", dashboardLayout);
  }

  setPreference(
    "defaultProduct",
    defaultProduct === "__none__" ? null : (defaultProduct ?? null),
  );

  if (language) {
    setPreference("language", language);
    const cookieStore = await cookies();
    cookieStore.set("locale", language, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
  }

  revalidatePath("/settings");
  revalidatePath("/");
}
