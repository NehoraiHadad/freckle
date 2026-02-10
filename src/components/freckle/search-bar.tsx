"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
  placeholder?: string;
  defaultValue?: string;
  paramName?: string;
  debounceMs?: number;
  className?: string;
}

export function SearchBar({
  placeholder = "Search...",
  defaultValue = "",
  paramName = "search",
  debounceMs = 300,
  className,
}: SearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("common");
  const [value, setValue] = useState(
    defaultValue || searchParams.get(paramName) || ""
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateUrl = useCallback(
    (newValue: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newValue) {
        params.set(paramName, newValue);
      } else {
        params.delete(paramName);
      }
      params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams, paramName]
  );

  const handleChange = (newValue: string) => {
    setValue(newValue);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      updateUrl(newValue);
    }, debounceMs);
  };

  const handleClear = () => {
    setValue("");
    updateUrl("");
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <div role="search" className={cn("relative", className)}>
      <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        className="ps-9 pe-9"
        aria-label={placeholder}
      />
      {value && (
        <Button
          variant="ghost"
          size="icon-xs"
          className="absolute end-2 top-1/2 -translate-y-1/2"
          onClick={handleClear}
          aria-label={t("clearSearch")}
        >
          <X className="size-3" />
        </Button>
      )}
    </div>
  );
}
