"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { HealthBadge } from "@/components/freckle/health-badge";
import type { ProductSummary } from "@/types/admin-api";

interface ProductSwitcherProps {
  products: ProductSummary[];
  currentProduct: string | null;
}

export function ProductSwitcher({
  products,
  currentProduct,
}: ProductSwitcherProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const t = useTranslations("products");
  const selected = products.find((p) => p.slug === currentProduct);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select a product"
          className="w-full justify-between"
        >
          <span className="flex items-center gap-2 truncate">
            {selected ? (
              <>
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold uppercase">
                  {selected.displayName.charAt(0)}
                </span>
                <span className="truncate">{selected.displayName}</span>
              </>
            ) : (
              t("selectProduct")
            )}
          </span>
          <ChevronsUpDown className="ms-auto size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={t("searchProducts")} />
          <CommandList>
            <CommandEmpty>{t("noProductsFound")}</CommandEmpty>
            <CommandGroup>
              {products.map((product) => (
                <CommandItem
                  key={product.slug}
                  value={product.displayName}
                  onSelect={() => {
                    router.push(`/p/${product.slug}`);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-2",
                    currentProduct === product.slug && "bg-accent"
                  )}
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold uppercase">
                    {product.displayName.charAt(0)}
                  </span>
                  <span className="flex-1 truncate">{product.displayName}</span>
                  <HealthBadge
                    status={product.healthStatus}
                    showLabel={false}
                    size="sm"
                  />
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  router.push("/products/new");
                  setOpen(false);
                }}
              >
                <Plus className="size-4" />
                <span>{t("registerNew")}</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
