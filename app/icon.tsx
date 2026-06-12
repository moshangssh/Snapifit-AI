import { ImageResponse } from "next/og"

export const runtime = "edge"
export const contentType = "image/png"

export function generateImageMetadata() {
  return [
    { id: "192", size: { width: 192, height: 192 }, contentType: "image/png" },
    { id: "512", size: { width: 512, height: 512 }, contentType: "image/png" },
  ]
}

export default function Icon({ id }: { id: string }) {
  const px = id === "512" ? 512 : 192
  // 字号按比例缩放,保留 ~12% safe zone 让 maskable 也好看
  const fontSize = Math.round(px * 0.68)

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FAFAF7",
          color: "#1C1C1E",
          fontSize,
          fontWeight: 700,
          letterSpacing: "-0.04em",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
        }}
      >
        S
      </div>
    ),
    { width: px, height: px },
  )
}
