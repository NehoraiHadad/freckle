"use client";

import { useTheme } from "next-themes";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { savePreferences } from "./settings-actions";
import type { Preferences } from "@/types/preferences";
import type { Product } from "@/types/product";

interface SettingsFormProps {
  preferences: Preferences;
  products: Product[];
}

export function SettingsForm({ preferences, products }: SettingsFormProps) {
  const { setTheme } = useTheme();
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  return (
    <form
      action={async (formData: FormData) => {
        const theme = formData.get("theme") as string;
        setTheme(theme);
        await savePreferences(formData);
        toast.success(t("settingsSaved"));
      }}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("appearance")}</CardTitle>
          <CardDescription>
            {t("appearanceDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="theme" className="text-sm font-medium">
              {t("theme")}
            </label>
            <Select name="theme" defaultValue={preferences.theme}>
              <SelectTrigger id="theme">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">{t("themeLight")}</SelectItem>
                <SelectItem value="dark">{t("themeDark")}</SelectItem>
                <SelectItem value="system">{t("themeSystem")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label htmlFor="language" className="text-sm font-medium">
              {t("language")}
            </label>
            <Select name="language" defaultValue={locale}>
              <SelectTrigger id="language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t("languageEn")}</SelectItem>
                <SelectItem value="he">{t("languageHe")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label htmlFor="dashboardLayout" className="text-sm font-medium">
              {t("dashboardLayout")}
            </label>
            <Select name="dashboardLayout" defaultValue={preferences.dashboardLayout}>
              <SelectTrigger id="dashboardLayout">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grid">{t("layoutGrid")}</SelectItem>
                <SelectItem value="list">{t("layoutList")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("defaults")}</CardTitle>
          <CardDescription>
            {t("defaultsDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="defaultProduct" className="text-sm font-medium">
              {t("defaultProduct")}
            </label>
            <Select
              name="defaultProduct"
              defaultValue={preferences.defaultProduct ?? "__none__"}
            >
              <SelectTrigger id="defaultProduct">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{tCommon("none")}</SelectItem>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t("defaultProductDescription")}
            </p>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full">
        {t("saveSettings")}
      </Button>
    </form>
  );
}
