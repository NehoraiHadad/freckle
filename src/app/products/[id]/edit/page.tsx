import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Shell } from "@/components/layout/shell";
import { getProduct } from "@/lib/db/products";
import { EditProductForm } from "./edit-product-form";

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;
  const product = getProduct(id);

  if (!product) notFound();

  const tNav = await getTranslations("nav");
  const tProducts = await getTranslations("products");

  return (
    <Shell
      breadcrumbs={[
        { label: tNav("dashboard"), href: "/" },
        { label: tNav("products"), href: "/products" },
        { label: product.name, href: `/p/${product.id}` },
        { label: tProducts("edit") },
      ]}
      currentProductId={product.id}
    >
      <EditProductForm product={product} />
    </Shell>
  );
}
