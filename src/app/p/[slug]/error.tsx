"use client";

import { useEffect } from "react";
import { ErrorBanner } from "@/components/freckle/error-banner";

export default function ProductError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Product error boundary caught:", error);
  }, [error]);

  return (
    <div className="space-y-6">
      <ErrorBanner
        error={{
          code: "product_error",
          message: error.message || "An error occurred while loading this product.",
        }}
        onRetry={reset}
      />
    </div>
  );
}
