"use client";

import { useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { updateProductAction, testConnection } from "@/actions/product-actions";
import type { Product } from "@/types/product";

interface EditProductFormProps {
  product: Product;
}

export function EditProductForm({ product }: EditProductFormProps) {
  const router = useRouter();
  const t = useTranslations("products");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    error?: string;
    health?: unknown;
    meta?: unknown;
  } | null>(null);
  const [isActive, setIsActive] = useState(product.status === "active");

  const boundAction = updateProductAction.bind(null, product.id);

  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      formData.set("status", isActive ? "active" : "inactive");
      const result = await boundAction(_prev, formData);
      if (result.success) {
        router.push(`/p/${product.id}`);
      }
      return result;
    },
    null,
  );

  const handleTest = async (formData: FormData) => {
    setTesting(true);
    setTestResult(null);
    const baseUrl = (formData.get("baseUrl") as string) || product.baseUrl;
    const apiKey = (formData.get("apiKey") as string) || product.apiKey;

    if (!baseUrl) {
      setTestResult({ error: t("baseUrlRequired") });
      setTesting(false);
      return;
    }

    const result = await testConnection(baseUrl, apiKey);
    setTestResult(result);
    setTesting(false);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {t("editTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("editDescription")}
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
                defaultValue={product.name}
                placeholder={t("displayName")}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="baseUrl" className="text-sm font-medium">
                {t("baseUrl")} <span className="text-destructive">*</span>
              </label>
              <Input
                id="baseUrl"
                name="baseUrl"
                defaultValue={product.baseUrl}
                placeholder="https://example.com/api/admin/v1"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="apiKey" className="text-sm font-medium">
                {t("apiKey")}
              </label>
              <Input
                id="apiKey"
                name="apiKey"
                type="password"
                placeholder={t("apiKeyUnchanged")}
              />
              <p className="text-xs text-muted-foreground">
                {t("apiKeyUnchanged")}
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                {t("description")}
              </label>
              <Input
                id="description"
                name="description"
                defaultValue={product.description ?? ""}
                placeholder={t("descriptionPlaceholder")}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="status"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <label htmlFor="status" className="text-sm font-medium">
                {isActive ? t("statusActive") : t("statusInactive")}
              </label>
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

        {testResult?.meta != null && !testResult.error && (
          <div className="flex items-center gap-2 rounded-lg border border-green-500/50 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
            <CheckCircle2 className="size-4 shrink-0" />
            {t("connectionSuccessful")}
          </div>
        )}

        {state?.error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
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
          {t("updateProduct")}
        </Button>
      </form>
    </div>
  );
}
