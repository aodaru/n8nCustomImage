import React from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";
import { COLORS, SAFE, SEAM, SP, TYPE } from "./tokens";
import { CharStagger, DrawPath, useIn, wipe } from "./motion";

const { fontFamily } = loadFont("normal", {
  weights: ["500", "600", "700"],
  subsets: ["latin"],
  ignoreTooManyRequestsWarning: true,
});

const shadow = "0 6px 26px rgba(0,0,0,0.6), 0 1px 0 rgba(0,0,0,0.4)";
const F = {
  fontFamily,
  WebkitTextStroke: "2px rgba(0,0,0,0.34)",
  paintOrder: "stroke fill" as const,
  textShadow: shadow,
};
const OUT = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

/**
 * PANEL DE COSTURA — el contenedor del tramo partido. Flota en la banda muerta
 * entre el pie de la captura y la cabeza del sujeto, así que a diferencia del Panel
 * de los tramos de cara va cerrado por los cuatro lados y no anclado abajo.
 */
export const SeamPanel: React.FC<{
  hold: number;
  kicker: string;
  accent?: string;
  children: React.ReactNode;
}> = ({ hold, kicker, accent = COLORS.gold, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 17, mass: 0.7, stiffness: 135 } });
  const exit = interpolate(frame, [hold - 9, hold], [0, 1], OUT);
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.x0,
        width: SAFE.x1 - SAFE.x0,
        top: SEAM.top,
        maxHeight: SEAM.maxHeight,
        boxSizing: "border-box",
        opacity: 1 - exit,
        clipPath: wipe(enter, "up"),
        transform: `translateY(${(1 - enter) * 18 - exit * 18}px)`,
        background: "rgba(9,11,14,0.93)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(140,130,114,0.4)",
        borderTop: `4px solid ${accent}`,
        borderRadius: 18,
        boxShadow: "0 18px 50px -14px rgba(0,0,0,0.85)",
        padding: `${SP.md}px ${SP.lg}px`,
        display: "flex",
        flexDirection: "column",
        gap: SP.sm,
      }}
    >
      <div
        style={{
          font: `700 ${TYPE.eyebrow}px/1 ${fontFamily}`,
          color: accent,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          flexShrink: 0,
        }}
      >
        {kicker}
      </div>
      {children}
    </div>
  );
};

/**
 * Fila de chips que entran uno a uno en su frame exacto del transcript.
 * `logo` pinta la marca; `mono` es el recurso para las que no tienen un símbolo
 * limpio (Kimi Code) — un monograma en la paleta, para que la fila no mezcle
 * dos logos de marca con un hueco.
 */
export const SeamChips: React.FC<{
  chips: { text: string; d: number; logo?: string; mono?: string }[];
  tone?: string;
}> = ({ chips, tone = COLORS.beige }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: "flex", gap: SP.sm, flexWrap: "wrap", alignItems: "center" }}>
      {chips.map((c) => {
        const p = spring({ frame: frame - c.d, fps, config: { damping: 14, mass: 0.6, stiffness: 160 } });
        return (
          <div
            key={c.text}
            style={{
              font: `700 35px/1 ${fontFamily}`,
              color: tone,
              textTransform: "uppercase",
              letterSpacing: "-0.01em",
              border: `2px solid ${tone}55`,
              background: `${tone}1a`,
              borderRadius: 12,
              padding: "15px 22px",
              opacity: p,
              // giro sobre el eje X: los chips CAEN en su sitio, como fichas
              transform: `perspective(700px) rotateX(${interpolate(p, [0, 1], [-78, 0])}deg)`,
              transformOrigin: "50% 0%",
              ...F,
            }}
          >
            {c.logo ? (
              <Img
                src={staticFile(`logos/${c.logo}`)}
                style={{
                  width: 34,
                  height: 34,
                  marginRight: 12,
                  verticalAlign: "-8px",
                  transform: `scale(${interpolate(p, [0, 1], [0.4, 1])})`,
                }}
              />
            ) : c.mono ? (
              <span
                style={{
                  display: "inline-block",
                  width: 34,
                  height: 34,
                  lineHeight: "32px",
                  textAlign: "center",
                  marginRight: 12,
                  verticalAlign: "-8px",
                  borderRadius: 9,
                  border: `2px solid ${COLORS.gold}`,
                  color: COLORS.gold,
                  fontSize: 24,
                  WebkitTextStroke: "0",
                  transform: `scale(${interpolate(p, [0, 1], [0.4, 1])})`,
                }}
              >
                {c.mono}
              </span>
            ) : null}
            {c.text}
          </div>
        );
      })}
    </div>
  );
};

/**
 * LO BUENO / LO MALO. Es el recap del final: él suelta las seis cosas en catorce
 * segundos de tirón y la tarjeta las sostiene a la vez para que se comparen —
 * eso es lo que el habla no puede hacer. Cada ítem entra en el frame en que lo
 * nombra, así que la tarjeta nunca va por delante de su voz.
 */
export const SeamVersus: React.FC<{
  hold: number;
  kicker: string;
  left: { head: string; items: { t: string; d: number }[] };
  right: { head: string; items: { t: string; d: number }[] };
}> = ({ hold, kicker, left, right }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const col = (side: { head: string; items: { t: string; d: number }[] }, tone: string) => (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          font: `700 31px/1.05 ${fontFamily}`,
          color: tone,
          textTransform: "uppercase",
          borderBottom: `2px solid ${tone}`,
          paddingBottom: 6,
          ...F,
        }}
      >
        {side.head}
      </div>
      {side.items.map((it) => {
        const p = spring({ frame: frame - it.d, fps, config: { damping: 16, mass: 0.6, stiffness: 165 } });
        return (
          <div
            key={it.t}
            style={{
              font: `600 30px/1.15 ${fontFamily}`,
              color: COLORS.beige,
              textTransform: "uppercase",
              clipPath: wipe(p, "left"),
              transform: `translateX(${interpolate(p, [0, 1], [-20, 0])}px)`,
            }}
          >
            {it.t}
          </div>
        );
      })}
    </div>
  );
  return (
    <SeamPanel hold={hold} kicker={kicker}>
      <div style={{ display: "flex", gap: SP.lg, alignItems: "flex-start" }}>
        {col(left, COLORS.green)}
        <div
          style={{
            width: 2,
            alignSelf: "stretch",
            background: "rgba(140,130,114,0.45)",
            transform: `scaleY(${useIn(6, 18)})`,
            transformOrigin: "50% 0%",
          }}
        />
        {col(right, COLORS.coral)}
      </div>
    </SeamPanel>
  );
};

/**
 * LA OFERTA. Él dice de viva voz la palabra que hay que comentar para que les
 * mande la skill; esta tarjeta no la repite, la deja LEGIBLE — que es lo único
 * que un subtítulo de karaoke a tres palabras no consigue.
 */
export const SeamOffer: React.FC<{ hold: number; kicker: string; word: string; sub: string }> = ({
  hold,
  kicker,
  word,
  sub,
}) => {
  const s = useIn(20, 15);
  return (
    <SeamPanel hold={hold} kicker={kicker} accent={COLORS.green}>
      {/* letra a letra: es la palabra que hay que TECLEAR, así que se escribe */}
      <CharStagger
        text={word}
        d={6}
        per={1.6}
        style={{
          font: `700 68px/1.05 ${fontFamily}`,
          color: COLORS.gold,
          letterSpacing: "-0.02em",
          display: "block",
          ...F,
          textShadow: `${shadow}, 0 0 30px rgba(233,185,73,0.4)`,
        }}
      />
      <div
        style={{
          font: `600 ${TYPE.chip}px/1.2 ${fontFamily}`,
          color: COLORS.beige,
          textTransform: "uppercase",
          opacity: s,
        }}
      >
        {sub}
      </div>
    </SeamPanel>
  );
};

/**
 * EL COSTE CAMBIÓ DE SITIO. Él dice "es un proceso largo de unos 15 minutos" y
 * "es bastante caro en tokens, pero para mí es conveniente" — y deja implícito
 * el trueque, que es lo único interesante de esa frase: antes eso lo pagaba con
 * su tarde, ahora lo paga con dinero. La tarjeta pone el trueque, no las cifras.
 */
export const SeamTrade: React.FC<{
  hold: number;
  kicker: string;
  before: { label: string; value: string };
  after: { label: string; value: string };
  atAfter: number;
}> = ({ hold, kicker, before, after, atAfter }) => {
  const a = useIn(6, 15);
  const arrow = useIn(atAfter - 6, 16);
  const b = useIn(atAfter, 15);
  const side = (
    x: { label: string; value: string },
    tone: string,
    p: number,
    strike: boolean,
  ) => (
    <div style={{ flex: 1, minWidth: 0, clipPath: wipe(p, "left") }}>
      <div
        style={{
          font: `600 24px/1 ${fontFamily}`,
          color: "rgba(239,231,214,0.55)",
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          marginBottom: 10,
        }}
      >
        {x.label}
      </div>
      <div
        style={{
          font: `700 50px/1.05 ${fontFamily}`,
          color: tone,
          textTransform: "uppercase",
          letterSpacing: "-0.02em",
          position: "relative",
          display: "inline-block",
          ...F,
        }}
      >
        {x.value}
        {strike ? (
          <span
            style={{
              position: "absolute",
              left: -4,
              right: -4,
              top: "52%",
              height: 4,
              borderRadius: 2,
              background: tone,
              transform: `scaleX(${useIn(atAfter + 6, 18)})`,
              transformOrigin: "0% 50%",
            }}
          />
        ) : null}
      </div>
    </div>
  );
  return (
    <SeamPanel hold={hold} kicker={kicker}>
      <div style={{ display: "flex", alignItems: "center", gap: SP.md }}>
        {side(before, COLORS.coral, a, true)}
        <svg width="64" height="30" style={{ flexShrink: 0, opacity: arrow }}>
          <DrawPath d={atAfter - 6} path="M 4 15 L 52 15" len={48} stroke={COLORS.gold} width={4} dur={8} />
          <DrawPath d={atAfter - 2} path="M 44 7 L 56 15 L 44 23" len={30} stroke={COLORS.gold} width={4} dur={6} />
        </svg>
        {side(after, COLORS.green, b, false)}
      </div>
    </SeamPanel>
  );
};

/**
 * EL BUCLE DE REVISIÓN. Él cuenta que la skill va tomando capturas del vídeo
 * para comprobar que la salida cumple los requisitos visuales que él definió —
 * pero nunca dice la palabra que lo explica: que eso es un BUCLE, no un pase.
 * Ese es el aporte de la tarjeta, y por eso el arco de vuelta se dibuja.
 */
export const SeamLoop: React.FC<{
  hold: number;
  kicker: string;
  steps: { t: string; d: number }[];
  loopAt: number;
  loopLabel: string;
}> = ({ hold, kicker, steps, loopAt, loopLabel }) => {
  const W = 796;
  const NODE = 172;
  const GAP = (W - NODE * steps.length) / (steps.length - 1);
  const loop = useIn(loopAt, 17);
  return (
    <SeamPanel hold={hold} kicker={kicker}>
      <div style={{ position: "relative", width: W, height: 168 }}>
        {steps.map((s, i) => {
          const p = useIn(s.d, 15, 165);
          const x = i * (NODE + GAP);
          return (
            <React.Fragment key={s.t}>
              {i > 0 ? (
                <svg
                  width={GAP}
                  height="20"
                  style={{ position: "absolute", left: x - GAP, top: 22 }}
                >
                  <DrawPath
                    d={s.d - 4}
                    path={`M 2 10 L ${GAP - 4} 10`}
                    len={GAP}
                    stroke="rgba(140,130,114,0.75)"
                    width={3}
                    dur={5}
                  />
                </svg>
              ) : null}
              <div
                style={{
                  position: "absolute",
                  left: x,
                  top: 0,
                  width: NODE,
                  boxSizing: "border-box",
                  textAlign: "center",
                  font: `700 26px/1.1 ${fontFamily}`,
                  color: COLORS.beige,
                  textTransform: "uppercase",
                  letterSpacing: "-0.01em",
                  border: "2px solid rgba(140,130,114,0.5)",
                  background: "rgba(239,231,214,0.07)",
                  borderRadius: 12,
                  padding: "16px 8px",
                  opacity: p,
                  transform: `translateY(${interpolate(p, [0, 1], [16, 0])}px) scale(${interpolate(
                    p,
                    [0, 1],
                    [0.86, 1],
                  )})`,
                }}
              >
                {s.t}
              </div>
            </React.Fragment>
          );
        })}
        {/* el arco de vuelta: es LO que convierte la fila en un bucle */}
        <svg width={W} height="80" style={{ position: "absolute", left: 0, top: 62 }}>
          <DrawPath
            d={loopAt}
            path={`M ${W - NODE / 2} 8 C ${W - NODE / 2} 62, ${NODE / 2} 62, ${NODE / 2} 8`}
            len={1400}
            stroke={COLORS.gold}
            width={3}
            dur={18}
          />
          <DrawPath
            d={loopAt + 14}
            path={`M ${NODE / 2 - 9} 18 L ${NODE / 2} 6 L ${NODE / 2 + 9} 18`}
            len={30}
            stroke={COLORS.gold}
            width={3}
            dur={5}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 130,
            textAlign: "center",
            font: `700 24px/1 ${fontFamily}`,
            color: COLORS.gold,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            opacity: loop,
          }}
        >
          {loopLabel}
        </div>
      </div>
    </SeamPanel>
  );
};
