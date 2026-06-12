import type React from "react"
import type { Metadata, Viewport } from "next"
import { Suspense } from "react"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { MainNav } from "@/components/main-nav"
import { BottomTab } from "@/components/ui/bottom-tab"
import { PWARegister } from "@/components/pwa-register"

export const metadata: Metadata = {
  title: "SnapFit AI",
  description: "中文 AI 健康管理助手，提供饮食、训练和健康数据分析。",
  applicationName: "SnapFit AI",
  appleWebApp: {
    capable: true,
    title: "SnapFit",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  generator: 'Feather-2'
}

export const viewport: Viewport = {
  themeColor: "#FAFAF7",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="flex min-h-screen bg-background">
          <Suspense fallback={null}>
            <MainNav />
          </Suspense>
          <main className="min-w-0 flex-1 pb-[calc(56px+env(safe-area-inset-bottom))] sm720:pb-0">
            {children}
          </main>
        </div>
        <Suspense fallback={null}>
          <BottomTab />
        </Suspense>
        <Toaster />
        <PWARegister />
      </body>
    </html>
  )
}
