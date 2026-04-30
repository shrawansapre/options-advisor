import { ImageResponse } from "@vercel/og";

export const config = { runtime: "edge" };

export default function handler() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "linear-gradient(145deg, #07111f 0%, #0c1d38 55%, #07111f 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Large faded background glyph */}
      <div
        style={{
          position: "absolute",
          top: -90,
          right: -70,
          fontSize: 540,
          lineHeight: 1,
          color: "rgba(255,255,255,0.025)",
          display: "flex",
        }}
      >
        ◈
      </div>

      {/* Bottom accent line */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "38%",
          height: 3,
          background: "linear-gradient(90deg, #f59e0b, transparent)",
          display: "flex",
        }}
      />

      {/* Content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "60px 72px",
          width: "100%",
          height: "100%",
        }}
      >
        {/* Logo badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <div style={{ fontSize: 30, color: "#f59e0b", display: "flex" }}>◈</div>
          <div
            style={{
              fontSize: 12,
              letterSpacing: "0.22em",
              color: "rgba(255,255,255,0.35)",
              fontWeight: 700,
              fontFamily: "sans-serif",
              display: "flex",
            }}
          >
            OPTIONS ADVISOR
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 74,
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "-2.5px",
            lineHeight: 1.05,
            marginBottom: 26,
            fontFamily: "sans-serif",
          }}
        >
          <span>Trade smarter</span>
          <span style={{ color: "rgba(255,255,255,0.75)" }}>with AI.</span>
        </div>

        {/* Tagline */}
        <div
          style={{
            display: "flex",
            fontSize: 22,
            color: "rgba(255,255,255,0.38)",
            fontFamily: "sans-serif",
            letterSpacing: "0.01em",
          }}
        >
          Live market data · Options Greeks · Exit strategy
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 }
  );
}
