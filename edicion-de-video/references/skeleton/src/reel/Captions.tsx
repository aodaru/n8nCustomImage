import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { type Caption } from "@remotion/captions";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";
import { COLORS, SAFE } from "./tokens";
import { isBrandToken } from "./brand";

const { fontFamily } = loadFont("normal", {
  weights: ["500", "600", "700"],
  subsets: ["latin"],
  ignoreTooManyRequestsWarning: true,
});

type Range = [number, number];
type Page = { startMs: number; endMs: number; tokens: Caption[] };

/** Ventanas mínimas/máximas de lectura de una página de subtítulo. */
const MIN_PAGE_MS = 620;
const MAX_PAGE_MS = 2200;
const MERGE_LIMIT = 6;
/** El resalte dorado necesita durar algo o estrobea en las palabras cortas. */
const MIN_ACTIVE_MS = 150;

const paginate = (caps: Caption[], maxWords: number, maxGapMs = 650): Page[] => {
  const pages: Page[] = [];
  let cur: Caption[] = [];
  const push = () => {
    if (cur.length) pages.push({ startMs: cur[0].startMs, endMs: cur[cur.length - 1].endMs, tokens: cur });
  };
  for (const c of caps) {
    if (cur.length && (cur.length >= maxWords || c.startMs - cur[cur.length - 1].endMs > maxGapMs)) {
      push();
      cur = [];
    }
    cur.push(c);
  }
  push();

  // Whisper comprime rachas: en este audio mete 6 palabras en 0.18s
  // ("todo eso es inteligencia artificial local"). Esa página parpadea y no se
  // puede leer, así que se FUSIONA con la vecina en vez de mostrarse suelta.
  const merged: Page[] = [];
  for (const pg of pages) {
    const prev = merged[merged.length - 1];
    if (
      prev &&
      pg.startMs - prev.startMs < MIN_PAGE_MS &&
      prev.tokens.length + pg.tokens.length <= MERGE_LIMIT
    ) {
      prev.tokens = prev.tokens.concat(pg.tokens);
      prev.endMs = pg.endMs;
      continue;
    }
    merged.push({ ...pg, tokens: [...pg.tokens] });
  }

  // Contiguas pero con techo: si la siguiente tarda, la página se retira en vez
  // de quedarse colgada segundos después de que la frase terminó.
  for (let i = 0; i < merged.length; i++) {
    const next = merged[i + 1];
    const natural = next ? next.startMs : merged[i].endMs + MIN_PAGE_MS;
    merged[i].endMs = Math.min(natural, merged[i].startMs + MAX_PAGE_MS);
  }
  return merged;
};

const baseShadow = "0 4px 18px rgba(0,0,0,0.55), 0 1px 0 rgba(0,0,0,0.4)";

const Word: React.FC<{ tok: Caption; nowMs: number; pageStartMs: number; size: number }> = ({
  tok,
  nowMs,
  pageStartMs,
  size,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = (Math.max(tok.startMs, pageStartMs) / 1000) * fps;
  const p = spring({ frame: frame - enter, fps, config: { damping: 13, mass: 0.7, stiffness: 140 } });
  const y = interpolate(p, [0, 1], [26, 0]);
  const scale = interpolate(p, [0, 1], [0.72, 1]);
  const blur = interpolate(p, [0, 1], [10, 0], { extrapolateRight: "clamp" });
  const active =
    nowMs >= tok.startMs && nowMs < Math.max(tok.endMs, tok.startMs + MIN_ACTIVE_MS);
  const ap = spring({ frame: frame - (tok.startMs / 1000) * fps, fps, config: { damping: 16, mass: 0.5 } });
  const activeScale = active ? interpolate(ap, [0, 1], [1, 1.06]) : 1;
  return (
    <span
      style={{
        display: "inline-block",
        transform: `translateY(${y}px) scale(${scale * activeScale})`,
        opacity: interpolate(p, [0, 1], [0, 1]),
        filter: blur > 0.2 ? `blur(${blur}px)` : "none",
        color: active ? COLORS.gold : COLORS.beige,
        margin: `0 ${size > 70 ? 14 : 10}px`,
        WebkitTextStroke: "2px rgba(0,0,0,0.4)",
        paintOrder: "stroke fill",
        textShadow: active ? `${baseShadow}, 0 0 24px rgba(233,185,73,0.45)` : baseShadow,
        fontSize: size,
        // "n8n" es marca en minúscula; escrita "N8N" canta a error
        textTransform: isBrandToken(tok.text) ? "none" : undefined,
      }}
    >
      {tok.text}
    </span>
  );
};

export const Captions: React.FC<{
  captions: Caption[];
  cy?: number;
  band?: boolean;
  maxWords?: number;
  size?: number;
  show?: Range[];
  hide?: Range[];
}> = ({ captions, cy = 1120, band = false, maxWords = 3, size = 92, show, hide = [] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pages = React.useMemo(() => paginate(captions, maxWords), [captions, maxWords]);
  const nowMs = (frame / fps) * 1000;

  if (show && !show.some(([a, b]) => nowMs >= a && nowMs < b)) return null;
  if (hide.some(([a, b]) => nowMs >= a && nowMs < b)) return null;
  const page = pages.find((pg) => nowMs >= pg.startMs && nowMs < pg.endMs);
  if (!page) return null;

  const pf = spring({ frame: frame - (page.startMs / 1000) * fps, fps, config: { damping: 18, mass: 0.6 } });
  const blockY = interpolate(pf, [0, 1], [8, 0]);

  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.x0,
        width: SAFE.x1 - SAFE.x0,
        top: cy - (band ? 70 : 200),
        height: band ? 140 : 400,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignContent: "center",
        gap: "6px 0",
        transform: `translateY(${blockY}px)`,
        fontFamily,
        fontWeight: 700,
        lineHeight: 1.02,
        letterSpacing: "-0.02em",
        textAlign: "center",
        textTransform: "uppercase",
      }}
    >
      {band && (
        <div
          style={{
            position: "absolute",
            inset: "0 auto",
            left: "50%",
            transform: "translateX(-50%)",
            width: "min-content",
            minWidth: 0,
          }}
        />
      )}
      <div
        style={{
          display: "inline-flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          // La caja de la banda se desvanece CON la primera palabra: al arrancar
          // una página nueva ninguna ha entrado todavía, y con opacidad fija se
          // veía un par de frames de caja de cristal vacía.
          opacity: band ? Math.min(1, pf * 1.8) : 1,
          padding: band ? "14px 30px" : 0,
          borderRadius: band ? 18 : 0,
          background: band ? "rgba(10,8,6,0.66)" : "transparent",
          backdropFilter: band ? "blur(10px)" : undefined,
          border: band ? "1px solid rgba(140,130,114,0.4)" : undefined,
          boxShadow: band ? "0 12px 40px -14px rgba(0,0,0,0.75)" : undefined,
        }}
      >
        {page.tokens.map((t, i) => (
          <Word key={`${page.startMs}-${i}`} nowMs={nowMs} tok={t} pageStartMs={page.startMs} size={size} />
        ))}
      </div>
    </div>
  );
};
