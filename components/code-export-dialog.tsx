"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { generateAISDKCode, generateRouteHandlerCode } from "@/lib/code-generator"
import { useI18n } from "@/lib/i18n"
import type { Edge, Node } from "@xyflow/react"
import { Check, Copy, Download } from "lucide-react"
import { useState } from "react"

type CodeExportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  nodes: Node[]
  edges: Edge[]
}

export function CodeExportDialog({ open, onOpenChange, nodes, edges }: CodeExportDialogProps) {
  const [copied, setCopied] = useState(false)
  const { t } = useI18n()

  const workflowCode = generateAISDKCode(nodes, edges)
  const routeHandlerCode = generateRouteHandlerCode(nodes, edges)

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = (code: string, filename: string) => {
    const blob = new Blob([code], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("export.title")}</DialogTitle>
          <DialogDescription>{t("export.description")}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="workflow" className="w-full flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="workflow">{t("export.workflowTab")}</TabsTrigger>
            <TabsTrigger value="route">{t("export.routeTab")}</TabsTrigger>
          </TabsList>

          <TabsContent value="workflow" className="space-y-4 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{t("export.workflowDesc")}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleCopy(workflowCode)}>
                  {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                  {copied ? t("export.copied") : t("export.copy")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDownload(workflowCode, "workflow.ts")}>
                  <Download className="mr-2 h-4 w-4" />
                  {t("export.download")}
                </Button>
              </div>
            </div>
            <pre className="flex-1 overflow-auto rounded-lg border border-border bg-secondary p-4 min-h-0">
              <code className="text-xs font-mono text-foreground whitespace-pre-wrap break-words">{workflowCode}</code>
            </pre>
          </TabsContent>

          <TabsContent value="route" className="space-y-4 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{t("export.routeDesc")}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleCopy(routeHandlerCode)}>
                  {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                  {copied ? t("export.copied") : t("export.copy")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDownload(routeHandlerCode, "route.ts")}>
                  <Download className="mr-2 h-4 w-4" />
                  {t("export.download")}
                </Button>
              </div>
            </div>
            <pre className="flex-1 overflow-auto rounded-lg border border-border bg-secondary p-4 min-h-0">
              <code className="text-xs font-mono text-foreground whitespace-pre-wrap break-words">
                {routeHandlerCode}
              </code>
            </pre>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
