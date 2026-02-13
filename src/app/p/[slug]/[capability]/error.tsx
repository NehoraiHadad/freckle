"use client";

import { useEffect } from "react";
import { ErrorBanner } from "@/components/freckle/error-banner";

export default function CapabilityError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Capability error boundary caught:", error);
  }, [error]);

  return (
    <div className="space-y-6">
      <ErrorBanner
        error={{
          code: "capability_error",
          message: error.message || "An error occurred while loading this resource.",
        }}
        onRetry={reset}
      />
    </div>
  );
}
