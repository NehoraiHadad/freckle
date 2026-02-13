import type { Metadata } from "next";
import Link from "next/link";
import { Package, Plus, Pencil } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Shell } from "@/components/layout/shell";
import { HealthBadge } from "@/components/freckle/health-badge";
import { EmptyState } from "@/components/freckle/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAllProducts } from "@/lib/db/products";
import { DeleteProductButton } from "./delete-button";

export const metadata: Metadata = {
  title: "Products",
};

export default async function ProductsPage() {
  const products = getAllProducts();
  const t = await getTranslations("products");
  const tNav = await getTranslations("nav");

  return (
    <Shell
      breadcrumbs={[
        { label: tNav("dashboard"), href: "/" },
        { label: tNav("products") },
      ]}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("description")}
            </p>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/products/new">
              <Plus className="size-4" />
              {t("register")}
            </Link>
          </Button>
        </div>

        {products.length === 0 ? (
          <EmptyState
            icon={<Package />}
            title={t("noProducts")}
            description={t("noProductsDescription")}
            action={
              <Button asChild>
                <Link href="/products/new">{t("register")}</Link>
              </Button>
            }
          />
        ) : (
          <>
          {/* Mobile card layout */}
          <div className="space-y-3 md:hidden">
            {products.map((product) => (
              <Card key={product.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base">
                      <Link
                        href={`/p/${product.id}`}
                        className="hover:underline"
                      >
                        {product.name}
                      </Link>
                    </CardTitle>
                    <p className="truncate text-xs text-muted-foreground">
                      {product.baseUrl}
                    </p>
                  </div>
                  <HealthBadge status={product.healthStatus} size="sm" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={product.status === "active" ? "default" : "secondary"}
                    >
                      {product.status}
                    </Badge>
                    {product.productVersion && (
                      <span className="text-xs text-muted-foreground">
                        v{product.productVersion}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {product.capabilities.map((cap) => (
                      <Badge key={cap} variant="outline" className="text-xs">
                        {cap}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button asChild variant="ghost" size="icon-xs">
                      <Link href={`/products/${product.id}/edit`} aria-label={`${t("edit")} ${product.name}`}>
                        <Pencil className="size-3.5" aria-hidden="true" />
                      </Link>
                    </Button>
                    <DeleteProductButton
                      productId={product.id}
                      productName={product.name}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop table layout */}
          <div className="hidden rounded-md border md:block">
            <Table aria-label={t("title")}>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">{t("name")}</TableHead>
                  <TableHead scope="col">{t("health")}</TableHead>
                  <TableHead scope="col">{t("status")}</TableHead>
                  <TableHead scope="col">{t("version")}</TableHead>
                  <TableHead scope="col">{t("capabilities")}</TableHead>
                  <TableHead scope="col" className="w-[100px]">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <Link
                        href={`/p/${product.id}`}
                        className="font-medium hover:underline"
                      >
                        {product.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {product.baseUrl}
                      </p>
                    </TableCell>
                    <TableCell>
                      <HealthBadge status={product.healthStatus} size="sm" />
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={product.status === "active" ? "default" : "secondary"}
                      >
                        {product.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {product.productVersion ?? "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {product.capabilities.map((cap) => (
                          <Badge key={cap} variant="outline" className="text-xs">
                            {cap}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button asChild variant="ghost" size="icon-xs">
                          <Link href={`/products/${product.id}/edit`} aria-label={`${t("edit")} ${product.name}`}>
                            <Pencil className="size-3.5" aria-hidden="true" />
                          </Link>
                        </Button>
                        <DeleteProductButton
                          productId={product.id}
                          productName={product.name}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          </>
        )}
      </div>
    </Shell>
  );
}
