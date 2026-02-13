import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

export default async function ProductNotFound() {
  const t = await getTranslations("notFound");

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
        <FileQuestion className="size-6 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold">{t("productNotFound")}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {t("productDescription")}
      </p>
      <Button asChild variant="outline" className="mt-4">
        <Link href="/">{t("backToDashboard")}</Link>
      </Button>
    </div>
  );
}
