import { getClientManager } from "@/lib/api-client/product-client-manager"
import { getProduct } from "@/lib/db/products"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { classifyError } from "@/lib/api-client/errors"
import { ErrorBanner } from "@/components/freckle/error-banner"
import { ConfigEditor } from "@/components/freckle/config-editor"

interface ConfigPageProps {
  params: Promise<{ slug: string }>
}

export default async function ConfigPage({ params }: ConfigPageProps) {
  const { slug } = await params
  const product = getProduct(slug)
  if (!product) notFound()

  let configData: { settings: Record<string, unknown>; updatedAt: string; updatedBy: string } | null = null
  let error: { code: string; message: string } | null = null

  try {
    const client = getClientManager().getClient(slug)
    configData = await client.config.get()
  } catch (e) {
    const classified = classifyError(e)
    error = { code: classified.category, message: classified.userMessage }
  }

  const t = await getTranslations("config")

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>

      {error && <ErrorBanner error={error} />}

      {configData && (
        <ConfigEditor
          productId={slug}
          initialSettings={configData.settings}
          updatedAt={configData.updatedAt}
          updatedBy={configData.updatedBy}
        />
      )}
    </div>
  )
}
