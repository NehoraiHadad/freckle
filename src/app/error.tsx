"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  useEffect(() => {
    console.error("Root error boundary caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="mx-auto max-w-md space-y-4 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="size-6 text-destructive" />
        </div>
        <h1 className="text-xl font-semibold">{t("somethingWentWrong")}</h1>
        <p className="text-sm text-muted-foreground">
          {error.message || t("unexpectedError")}
        </p>
        <Button onClick={reset} variant="outline">
          <RotateCcw className="size-4" />
          {t("tryAgain")}
        </Button>
      </div>
    </div>
  );
}
