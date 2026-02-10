import { getProduct } from "@/lib/db/products"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Play } from "lucide-react"
import { EmptyState } from "@/components/freckle/empty-state"
import { OperationRunner } from "@/components/freckle/operation-runner"

interface OperationsPageProps {
  params: Promise<{ slug: string }>
}

export default async function OperationsPage({ params }: OperationsPageProps) {
  const { slug } = await params
  const product = getProduct(slug)
  if (!product) notFound()

  const operations = product.supportedActions.operations ?? []
  const t = await getTranslations("operations")

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>

      {operations.length === 0 ? (
        <EmptyState
          icon={<Play />}
          title={t("noOperations")}
          description={t("noOperationsDescription")}
        />
      ) : (
        <OperationRunner productId={product.id} operations={operations} />
      )}
    </div>
  )
}
