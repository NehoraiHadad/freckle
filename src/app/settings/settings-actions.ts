"use server";

import { cookies } from "next/headers";
import { setPreference } from "@/lib/db/preferences";
import { revalidatePath } from "next/cache";
import type { Preferences } from "@/types/preferences";

export async function savePreferences(formData: FormData): Promise<void> {
  const theme = formData.get("theme") as Preferences["theme"];
  const dashboardLayout = formData.get("dashboardLayout") as Preferences["dashboardLayout"];
  const defaultProduct = formData.get("defaultProduct") as string;
  const language = formData.get("language") as string;

  if (theme) {
    setPreference("theme", theme);
  }

  if (dashboardLayout) {
    setPreference("dashboardLayout", dashboardLayout);
  }

  setPreference(
    "defaultProduct",
    defaultProduct === "__none__" ? null : defaultProduct,
  );

  if (language && (language === "en" || language === "he")) {
    setPreference("language", language);
    const cookieStore = await cookies();
    cookieStore.set("locale", language, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  revalidatePath("/settings");
  revalidatePath("/");
}
