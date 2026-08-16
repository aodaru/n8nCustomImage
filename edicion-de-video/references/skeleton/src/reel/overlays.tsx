import React from "react";
import { AbsoluteFill } from "remotion";
import { SAFE, DZ } from "./tokens";

/**
 * Grano + viñeta. Es el único tratamiento de imagen del vídeo y forma parte del
 * estilo, no es un filtro de color: la cámara manda.
 */
const GRAIN =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>`,
  );

export const Grade: React.FC = () => (
  <>
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        backgroundImage: `url("${GRAIN}")`,
        backgroundSize: "540px 540px",
        opacity: 0.05,
        mixBlendMode: "overlay",
      }}
    />
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        // viñeta suave: en este vídeo hay que poder leer el terminal hasta las
        // esquinas, así que es más abierta que en los otros reels
        background:
          "radial-gradient(130% 96% at 50% 46%, transparent 62%, rgba(0,0,0,0.34) 100%)",
      }}
    />
  </>
);

/** Guías de danger-zone (dev/QA). */
export const SafeGuides: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: DZ.top, background: "rgba(240,112,79,0.28)" }} />
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: DZ.bottom, background: "rgba(240,112,79,0.28)" }} />
    <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: DZ.right, background: "rgba(240,112,79,0.28)" }} />
    <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: DZ.left, background: "rgba(240,112,79,0.28)" }} />
    <div
      style={{
        position: "absolute",
        left: SAFE.x0,
        top: SAFE.y0,
        width: SAFE.x1 - SAFE.x0,
        height: SAFE.y1 - SAFE.y0,
        border: "3px solid rgba(95,191,122,0.9)",
      }}
    />
  </AbsoluteFill>
);
