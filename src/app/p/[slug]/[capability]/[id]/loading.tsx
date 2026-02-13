import { Skeleton } from "@/components/ui/skeleton";

export default function EntityDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-20" />
      </div>
      <Skeleton className="h-[400px] w-full rounded-lg" />
    </div>
  );
}
