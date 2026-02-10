"use client";

import { useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { addProductAction, testConnection } from "@/actions/product-actions";

export function NewProductForm() {
  const router = useRouter();
  const t = useTranslations("products");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    error?: string;
    health?: unknown;
    meta?: unknown;
  } | null>(null);

  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      const result = await addProductAction(_prev, formData);
      if (result.success) {
        const meta = testResult?.meta as Record<string, unknown> | undefined;
        const slug = meta?.product as string;
        if (slug) {
          router.push(`/p/${slug}`);
        } else {
          router.push("/products");
        }
      }
      return result;
    },
    null,
  );

  const handleTest = async (formData: FormData) => {
    setTesting(true);
    setTestResult(null);
    const baseUrl = formData.get("baseUrl") as string;
    const apiKey = formData.get("apiKey") as string;

    if (!baseUrl || !apiKey) {
      setTestResult({ error: t("baseUrlRequired") });
      setTesting(false);
      return;
    }

    const result = await testConnection(baseUrl, apiKey);
    setTestResult(result);
    setTesting(false);
  };

  const meta = testResult?.meta as Record<string, unknown> | null | undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {t("register")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("description")}
        </p>
      </div>

      <form className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("connectionDetails")}</CardTitle>
            <CardDescription>
              {t("connectionDetailsDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                {t("displayName")}
              </label>
              <Input
                id="name"
                name="name"
                placeholder={t("displayName")}
              />
              <p className="text-xs text-muted-foreground">
                {t("displayNameOptional")}
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="baseUrl" className="text-sm font-medium">
                {t("baseUrl")} <span className="text-destructive">*</span>
              </label>
              <Input
                id="baseUrl"
                name="baseUrl"
                placeholder="https://example.com/api/admin/v1"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="apiKey" className="text-sm font-medium">
                {t("apiKey")} <span className="text-destructive">*</span>
              </label>
              <Input
                id="apiKey"
                name="apiKey"
                type="password"
                placeholder="Your ADMIN_API_KEY"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                {t("description")}
              </label>
              <Input
                id="description"
                name="description"
                placeholder={t("descriptionPlaceholder")}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={testing}
              onClick={(e) => {
                const form = e.currentTarget.closest("form")!;
                handleTest(new FormData(form));
              }}
            >
              {testing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {t("testConnection")}
            </Button>
          </CardContent>
        </Card>

        {testResult?.error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            {testResult.error}
          </div>
        )}

        {meta && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="size-4 text-green-500" />
                {t("connectionSuccessful")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <span className="text-muted-foreground">{t("product")}</span>
                <span className="font-medium">{meta.displayName as string}</span>
                <span className="text-muted-foreground">{t("slug")}</span>
                <span className="font-mono text-xs">{meta.product as string}</span>
                <span className="text-muted-foreground">{t("version")}</span>
                <span>{meta.version as string}</span>
                <span className="text-muted-foreground">{t("apiStandard")}</span>
                <span>{meta.apiStandardVersion as string}</span>
              </div>
              {Array.isArray(meta.capabilities) && (
                <div className="flex flex-wrap gap-1">
                  {(meta.capabilities as string[]).map((cap) => (
                    <Badge key={cap} variant="secondary" className="text-xs">
                      {cap}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {state?.error && (
          <div id="form-error" role="alert" className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            {state.error}
          </div>
        )}

        <Button
          type="submit"
          formAction={formAction}
          disabled={isPending}
          className="w-full"
        >
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {t("register")}
        </Button>
      </form>
    </div>
  );
}
