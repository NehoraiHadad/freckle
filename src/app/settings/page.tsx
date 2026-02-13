import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Shell } from "@/components/layout/shell";
import { getAllProducts } from "@/lib/db/products";
import { getAllPreferences } from "@/lib/db/preferences";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const preferences = getAllPreferences();
  const products = getAllProducts();
  const t = await getTranslations("settings");
  const tNav = await getTranslations("nav");

  return (
    <Shell
      breadcrumbs={[
        { label: tNav("dashboard"), href: "/" },
        { label: tNav("settings") },
      ]}
    >
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <SettingsForm preferences={preferences} products={products} />
      </div>
    </Shell>
  );
}
