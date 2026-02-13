import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="mx-auto max-w-md space-y-4 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
          <FileQuestion className="size-6 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
        <Button asChild variant="outline">
          <Link href="/">{t("backToDashboard")}</Link>
        </Button>
      </div>
    </div>
  );
}
