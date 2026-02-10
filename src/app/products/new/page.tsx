import { getTranslations } from "next-intl/server";
import { Shell } from "@/components/layout/shell";
import { NewProductForm } from "./new-product-form";

export default async function NewProductPage() {
  const tNav = await getTranslations("nav");
  const tProducts = await getTranslations("products");

  return (
    <Shell
      breadcrumbs={[
        { label: tNav("dashboard"), href: "/" },
        { label: tNav("products"), href: "/products" },
        { label: tProducts("register") },
      ]}
    >
      <NewProductForm />
    </Shell>
  );
}
