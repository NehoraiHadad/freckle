import { Suspense } from "react"
import { getTranslations } from "next-intl/server"
import { getClientManager } from "@/lib/api-client/product-client-manager"
import { getProduct } from "@/lib/db/products"
import { notFound } from "next/navigation"
import { classifyError } from "@/lib/api-client/errors"
import { ErrorBanner } from "@/components/freckle/error-banner"
import { ActivityFeed } from "@/components/freckle/activity-feed"
import { TrendsChart } from "@/components/freckle/trends-chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart3, Users, Zap } from "lucide-react"

interface UsageData {
  apiCalls?: number
  uniqueUsers?: number
  topFeatures?: { feature: string; count: number; percentage: number }[]
  period?: string
  [key: string]: unknown
}

interface AnalyticsPageProps {
  params: Promise<{ slug: string }>
}

async function UsageStatsSection({ slug }: { slug: string }) {
  const t = await getTranslations("analytics")
  let usageData: UsageData | null = null
  let error: { code: string; message: string } | null = null

  try {
    const client = getClientManager().getClient(slug)
    usageData = (await client.analytics.usage({ period: "7d" })) as UsageData
  } catch (e) {
    const classified = classifyError(e)
    error = { code: classified.category, message: classified.userMessage }
  }

  return (
    <>
      {error && <ErrorBanner error={error} />}

      {usageData && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {usageData.apiCalls !== undefined && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("apiCalls")}
                </CardTitle>
                <Zap className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {usageData.apiCalls.toLocaleString()}
                </div>
                {usageData.period && (
                  <p className="text-xs text-muted-foreground">
                    {t("lastPeriod", { period: usageData.period })}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {usageData.uniqueUsers !== undefined && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("uniqueUsers")}
                </CardTitle>
                <Users className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {usageData.uniqueUsers.toLocaleString()}
                </div>
                {usageData.period && (
                  <p className="text-xs text-muted-foreground">
                    {t("lastPeriod", { period: usageData.period })}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {usageData.topFeatures && usageData.topFeatures.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("topFeature")}
                </CardTitle>
                <BarChart3 className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {usageData.topFeatures[0].feature
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </div>
                <p className="text-xs text-muted-foreground">
                  {usageData.topFeatures[0].count.toLocaleString()} calls (
                  {usageData.topFeatures[0].percentage}%)
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {usageData?.topFeatures && usageData.topFeatures.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("topFeatures")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {usageData.topFeatures.map((f) => (
                <div key={f.feature} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {f.feature
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {f.count.toLocaleString()} ({f.percentage}%)
                      </span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${f.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}

function UsageStatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-[104px] w-full rounded-lg" />
      ))}
    </div>
  )
}

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const { slug } = await params
  const product = getProduct(slug)
  if (!product) notFound()

  const t = await getTranslations("analytics")

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t("title")}</h1>

      <Suspense fallback={<UsageStatsSkeleton />}>
        <UsageStatsSection slug={slug} />
      </Suspense>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <TrendsChart productSlug={slug} className="lg:col-span-2" />
        <ActivityFeed productSlug={slug} compact={false} />
      </div>
    </div>
  )
}
