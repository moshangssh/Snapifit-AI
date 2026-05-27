import { ImageResponse } from "next/og"

export const runtime = "edge"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
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
          fontSize: 124,
          fontWeight: 700,
          letterSpacing: "-0.04em",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
        }}
      >
        S
      </div>
    ),
    { ...size },
  )
}
