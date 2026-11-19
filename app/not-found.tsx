import { AuthShell } from "@/components/auth-shell"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function NotFound() {
  return (
    <AuthShell>
      <div className="text-center">
        <p className="text-5xl font-bold tracking-tight text-primary">404</p>
        <h1 className="mt-3 text-xl font-semibold text-foreground">页面不存在</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          链接可能已失效，或该工作流已被删除。
        </p>
        <Button asChild className="mt-6 w-full">
          <Link href="/">返回画布</Link>
        </Button>
      </div>
    </AuthShell>
  )
}
