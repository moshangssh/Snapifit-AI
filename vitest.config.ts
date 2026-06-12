import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  // tsconfig 的 jsx: "preserve" 会让 oxc 跳过 JSX 转译;组件渲染测试(.test.tsx)
  // 需要 automatic runtime 才能在 node 环境用 react-dom/server 渲染。
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
  },
})
