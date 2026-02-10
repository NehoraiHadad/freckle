"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { Play, Loader2, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { executeOperation } from "@/actions/operation-actions"

interface OperationRunnerProps {
  productId: string
  operations: string[]
}

function operationToLabel(action: string): string {
  return action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function OperationRunner({ productId, operations }: OperationRunnerProps) {
  const t = useTranslations("operations")
  const tc = useTranslations("common")
  const [selectedOp, setSelectedOp] = useState<string | null>(null)
  const [dryRun, setDryRun] = useState(true)
  const [result, setResult] = useState<{
    success: boolean
    message: string
  } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleRun() {
    if (!selectedOp) return

    startTransition(async () => {
      setResult(null)
      const params: Record<string, unknown> = {}
      if (dryRun) params.dryRun = true

      const res = await executeOperation(productId, selectedOp, params)

      if (res.success) {
        const resultText =
          typeof res.data?.result === "string"
            ? res.data.result
            : JSON.stringify(res.data?.result, null, 2)
        setResult({ success: true, message: resultText || t("operationCompleted") })
      } else {
        setResult({ success: false, message: res.error || t("operationFailed") })
      }
    })
  }

  function handleRunForReal() {
    if (!selectedOp) return

    setDryRun(false)
    startTransition(async () => {
      setResult(null)
      const res = await executeOperation(productId, selectedOp, {})

      if (res.success) {
        const resultText =
          typeof res.data?.result === "string"
            ? res.data.result
            : JSON.stringify(res.data?.result, null, 2)
        setResult({ success: true, message: resultText || t("operationCompleted") })
      } else {
        setResult({ success: false, message: res.error || t("operationFailed") })
      }
    })
  }

  function handleClose() {
    setSelectedOp(null)
    setResult(null)
    setDryRun(true)
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {operations.map((op) => (
          <Card key={op}>
            <CardHeader>
              <CardTitle className="text-base">{operationToLabel(op)}</CardTitle>
              <CardDescription className="text-xs font-mono text-muted-foreground">
                {op}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                size="sm"
                aria-label={`Run ${operationToLabel(op)}`}
                onClick={() => {
                  setSelectedOp(op)
                  setResult(null)
                  setDryRun(true)
                }}
              >
                <Play className="me-1 size-3.5" aria-hidden="true" />
                {tc("run")}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={selectedOp !== null} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent aria-label={selectedOp ? `Run operation: ${operationToLabel(selectedOp)}` : "Run operation"}>
          <DialogHeader>
            <DialogTitle>
              {selectedOp ? operationToLabel(selectedOp) : t("runOperation")}
            </DialogTitle>
            <DialogDescription>
              {selectedOp && (
                <span className="font-mono text-xs">{selectedOp}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          {!result && (
            <div className="space-y-4 py-2">
              <label className="flex items-center gap-2 text-sm">
                <Input
                  type="checkbox"
                  className="size-4 w-auto"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                />
                {t("dryRun")}
              </label>
            </div>
          )}

          {result && (
            <div role="status" className="space-y-3 py-2">
              <div className="flex items-start gap-2">
                {result.success ? (
                  <CheckCircle className="mt-0.5 size-4 shrink-0 text-green-500" aria-hidden="true" />
                ) : (
                  <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
                )}
                <pre className="min-w-0 flex-1 whitespace-pre-wrap text-sm">
                  {result.message}
                </pre>
              </div>
            </div>
          )}

          <DialogFooter>
            {!result ? (
              <>
                <Button variant="outline" onClick={handleClose} disabled={isPending}>
                  {tc("cancel")}
                </Button>
                <Button onClick={handleRun} disabled={isPending}>
                  {isPending && <Loader2 className="me-1 size-3.5 animate-spin" />}
                  {dryRun ? t("runDryRun") : tc("run")}
                </Button>
              </>
            ) : result.success && dryRun ? (
              <>
                <Button variant="outline" onClick={handleClose}>
                  {tc("dismiss")}
                </Button>
                <Button onClick={handleRunForReal} disabled={isPending}>
                  {isPending && <Loader2 className="me-1 size-3.5 animate-spin" />}
                  {t("runForReal")}
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={handleClose}>
                {tc("close")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
