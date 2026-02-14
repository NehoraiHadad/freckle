import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ApiResource } from "@/types/openapi"

export function ChildResourceLinks({ slug, resources, endpointsLabel }: { slug: string; resources: ApiResource[]; endpointsLabel: (count: number) => string }) {
  const navigable = resources.filter(c => !c.requiresParentId)
  if (navigable.length === 0) return null

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {navigable.map((child) => (
        <Link key={child.key} href={`/p/${slug}/${child.key}`}>
          <Card className="transition-colors hover:bg-accent/50 cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                {child.name}
                <ArrowRight className="size-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {endpointsLabel(child.operations.length)}
              </p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
