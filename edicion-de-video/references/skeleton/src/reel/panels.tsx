import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";
import { COLORS, PANEL, SAFE, SP, TYPE } from "./tokens";
import { CountUp, DrawPath, useIn, wipe } from "./motion";

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

// ─────────────────────────────────────────────────────────────────────────────
// PANEL — el único contenedor. Vive en la franja y 880..1420 y por tanto NUNCA
// tapa la cara (que ocupa y 300..860). Todos los gráficos del vídeo son este
// panel con distinto contenido: eso es lo que les da un sistema.
// ─────────────────────────────────────────────────────────────────────────────
export const Panel: React.FC<{
  hold: number;
  accent?: string;
  children: React.ReactNode;
}> = ({ hold, accent = COLORS.gold, children }) => {
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
        // anclado abajo: crece hacia arriba con el contenido y nunca pasa de
        // y=880, que es donde está la barbilla
        bottom: PANEL.bottom,
        maxHeight: PANEL.maxHeight,
        opacity: 1 - exit,
        // entra DESTAPÁNDOSE de abajo arriba y sale bajando: la salida no es la
        // entrada al revés
        clipPath: wipe(enter, "up"),
        transform: `translateY(${(1 - enter) * 30 + exit * 26}px)`,
      }}
    >
      <div
        style={{
          width: "100%",
          maxHeight: PANEL.maxHeight,
          boxSizing: "border-box",
          background: "rgba(9,11,14,0.92)",
          borderTop: `4px solid ${accent}`,
          borderRadius: `6px 6px 22px 22px`,
          boxShadow: "0 26px 70px -18px rgba(0,0,0,0.92)",
          padding: `${SP.lg}px ${SP.xl}px ${SP.lg}px`,
          display: "flex",
          flexDirection: "column",
          gap: SP.md,
        }}
      >
        {children}
      </div>
    </div>
  );
};

/** Cintillo superior del panel. Siempre TYPE.eyebrow, siempre en el acento. */
export const Eyebrow: React.FC<{ children: React.ReactNode; tone?: string }> = ({
  children,
  tone = COLORS.gold,
}) => (
  <div
    style={{
      font: `700 ${TYPE.eyebrow}px/1 ${fontFamily}`,
      color: tone,
      letterSpacing: "0.2em",
      textTransform: "uppercase",
      flexShrink: 0,
    }}
  >
    {children}
  </div>
);

/** Fila de lista que entra desde la izquierda en su frame. */
const Row: React.FC<{ d: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  d,
  children,
  style,
}) => {
  const p = useIn(d);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: SP.md,
        clipPath: wipe(p, "left"),
        filter: `blur(${interpolate(p, [0, 1], [7, 0], OUT)}px)`,
        transform: `translateX(${interpolate(p, [0, 1], [-34, 0])}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/**
 * Zona de filas. Va CENTRADA con un gap fijo, no `space-evenly`: repartiendo
 * por todo el alto, un panel de dos filas las separaba media pantalla y se leía
 * como un error de maquetación.
 */
const Fill: React.FC<{ children: React.ReactNode; gap?: number }> = ({ children, gap = SP.md }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      flex: 1,
      minHeight: 0,
      justifyContent: "center",
      gap,
    }}
  >
    {children}
  </div>
);

const BodyText: React.FC<{ children: React.ReactNode; tone?: string; size?: number }> = ({
  children,
  tone = COLORS.beige,
  size = TYPE.body,
}) => (
  <span
    style={{
      font: `700 ${size}px/1.05 ${fontFamily}`,
      color: tone,
      textTransform: "uppercase",
      letterSpacing: "-0.02em",
      ...F,
    }}
  >
    {children}
  </span>
);

// ─────────────────────────────────────────────────────────────────────────────
// CONTRASTE — dos columnas. Existe por LA REGLA DE ORO: una tarjeta que
// dice lo mismo que la voz no añade nada, solo compite con el subtítulo. Aquí
// la tarjeta pone lo que él NO enumera.
// ─────────────────────────────────────────────────────────────────────────────
export const VersusPanel: React.FC<{
  hold: number;
  kicker: string;
  left: { head: string; items: string[] };
  right: { head: string; items: string[] };
}> = ({ hold, kicker, left, right }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const col = (side: { head: string; items: string[] }, tone: string, delay: number) => (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: SP.sm }}>
      <div
        style={{
          font: `700 30px/1.05 ${fontFamily}`,
          color: tone,
          textTransform: "uppercase",
          letterSpacing: "-0.01em",
          borderBottom: `2px solid ${tone}`,
          paddingBottom: 8,
          ...F,
        }}
      >
        {side.head}
      </div>
      {side.items.map((t, i) => {
        const p = spring({
          frame: frame - delay - i * 5,
          fps,
          config: { damping: 16, mass: 0.6, stiffness: 165 },
        });
        return (
          <div
            key={t}
            style={{
              font: `600 26px/1.2 ${fontFamily}`,
              color: COLORS.beige,
              textTransform: "uppercase",
              opacity: p,
              transform: `translateY(${interpolate(p, [0, 1], [14, 0])}px)`,
            }}
          >
            {t}
          </div>
        );
      })}
    </div>
  );
  return (
    <Panel hold={hold}>
      <Eyebrow>{kicker}</Eyebrow>
      <div style={{ display: "flex", gap: SP.lg, alignItems: "flex-start", flex: 1, minHeight: 0 }}>
        {col(left, COLORS.coral, 4)}
        <div style={{ width: 2, alignSelf: "stretch", background: "rgba(140,130,114,0.4)" }} />
        {col(right, COLORS.green, 16)}
      </div>
    </Panel>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CONSECUENCIA — la cadena de "por lo tanto" que él deja implícita. Igual que
// el contraste: existe para no repetir la frase que ya se está oyendo.
// ─────────────────────────────────────────────────────────────────────────────
export const ChainPanel: React.FC<{
  hold: number;
  kicker: string;
  /** un retardo por paso: cada eslabón cae en la palabra exacta del transcript */
  steps: { t: string; d: number }[];
  accent?: string;
}> = ({ hold, kicker, steps, accent = COLORS.coral }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const springAt = (d: number) =>
    spring({ frame: frame - d, fps, config: { damping: 16, mass: 0.7, stiffness: 155 } });
  return (
    <Panel hold={hold} accent={accent}>
      <Eyebrow tone={accent}>{kicker}</Eyebrow>
      <Fill gap={SP.xs}>
        {steps.map((s, i) => {
          const p = springAt(s.d);
          const isLast = i === steps.length - 1;
          return (
            <div key={s.t}>
              {i > 0 && (
                <svg width="26" height="26" style={{ display: "block", marginBottom: 1 }}>
                  <DrawPath d={s.d - 5} path="M 8 2 L 8 20" len={18} stroke={accent} width={3} dur={6} />
                  <DrawPath d={s.d - 2} path="M 3 15 L 8 21 L 13 15" len={17} stroke={accent} width={3} dur={5} />
                </svg>
              )}
              <div
                style={{
                  font: `700 ${isLast ? TYPE.body : 34}px/1.06 ${fontFamily}`,
                  color: isLast ? accent : COLORS.beige,
                  textTransform: "uppercase",
                  letterSpacing: "-0.02em",
                  clipPath: wipe(p, "left"),
                  transform: `translateX(${interpolate(p, [0, 1], [-26, 0])}px)`,
                  ...F,
                }}
              >
                {/* los minutos suben en vez de aparecer: es una cuenta */}
                {/^\d+ /.test(s.t) ? (
                  <>
                    <CountUp d={s.d} to={parseInt(s.t, 10)} dur={16} />
                    {s.t.slice(String(parseInt(s.t, 10)).length)}
                  </>
                ) : (
                  s.t
                )}
              </div>
            </div>
          );
        })}
      </Fill>
    </Panel>
  );
};

/** Banda de texto: el mismo panel, solo que con filas y chips. */
export const BandPanel: React.FC<{
  hold: number;
  kicker: string;
  /** `d` en frames desde el inicio del tramo — cada fila cae en su palabra */
  rows: { text: string; hi?: string; tone?: string; d: number; size?: number }[];
  chips?: { text: string; d: number }[];
  chipTone?: string;
  accent?: string;
}> = ({ hold, kicker, rows, chips, chipTone = COLORS.green, accent = COLORS.gold }) => (
  <Panel hold={hold} accent={accent}>
    <Eyebrow tone={accent}>{kicker}</Eyebrow>
    <Fill gap={SP.sm}>
      {rows.map((r) => {
        const parts = r.hi && r.text.includes(r.hi) ? r.text.split(r.hi) : null;
        return (
          <Row key={r.text} d={r.d}>
            <BodyText tone={r.tone} size={r.size}>
              {parts ? (
                <>
                  {parts[0]}
                  <span style={{ color: r.tone ?? accent }}>{r.hi}</span>
                  {parts[1]}
                </>
              ) : (
                r.text
              )}
            </BodyText>
          </Row>
        );
      })}
    </Fill>
    {chips ? (
      <div style={{ display: "flex", gap: SP.sm, flexWrap: "wrap", flexShrink: 0 }}>
        {chips.map((c) => (
          <Chip key={c.text} text={c.text} d={c.d} tone={chipTone} />
        ))}
      </div>
    ) : null}
  </Panel>
);

const Chip: React.FC<{ text: string; d: number; tone: string }> = ({ text, d, tone }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - d, fps, config: { damping: 14, mass: 0.6, stiffness: 160 } });
  return (
    <div
      style={{
        font: `700 ${TYPE.chip}px/1 ${fontFamily}`,
        color: tone,
        textTransform: "uppercase",
        border: `2px solid ${tone}`,
        background: `${tone}22`,
        borderRadius: 10,
        padding: `11px ${SP.md}px`,
        opacity: p,
        transform: `scale(${interpolate(p, [0, 1], [0.82, 1])})`,
      }}
    >
      {text}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// EL REMATE. Es lo único que va a pantalla, y aun así sobre un velo del 50%:
// se le sigue viendo la cara detrás.
// ─────────────────────────────────────────────────────────────────────────────
export const Payoff: React.FC<{
  hold: number;
  line1: React.ReactNode;
  line2: React.ReactNode;
  line2At: number;
}> = ({ hold, line1, line2, line2At }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const io =
    interpolate(frame, [0, 6], [0, 1], OUT) * interpolate(frame, [hold - 10, hold], [1, 0], OUT);
  const l1 = spring({ frame: frame - 4, fps, config: { damping: 16, mass: 0.7 } });
  const l2 = spring({ frame: frame - line2At, fps, config: { damping: 16, mass: 0.7 } });
  return (
    <AbsoluteFill style={{ opacity: io, pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: "rgba(9,11,14,0.5)" }} />
      <div
        style={{
          position: "absolute",
          left: SAFE.x0,
          width: SAFE.x1 - SAFE.x0,
          // 40px POR DEBAJO del tope de la franja, no 60 por encima como en el
          // reel anterior: en este encuadre la barba llega a y≈930 cuando se
          // inclina hacia el micro, y a 820 la primera línea le caía justo en
          // la punta de la barba.
          top: PANEL.top + 40,
          textAlign: "center",
        }}
      >
        <div
          style={{
            font: `700 ${TYPE.body}px/1.14 ${fontFamily}`,
            color: COLORS.beige,
            textTransform: "uppercase",
            letterSpacing: "-0.02em",
            opacity: l1,
            filter: `blur(${interpolate(l1, [0, 1], [12, 0], OUT)}px)`,
            ...F,
          }}
        >
          {line1}
        </div>
        <div
          style={{
            width: 260,
            height: 4,
            background: COLORS.gold,
            borderRadius: 2,
            margin: `${SP.lg}px auto`,
            transform: `scaleX(${l2})`,
          }}
        />
        <div
          style={{
            font: `700 ${TYPE.title}px/1.06 ${fontFamily}`,
            color: COLORS.gold,
            textTransform: "uppercase",
            letterSpacing: "-0.02em",
            opacity: l2,
            filter: `blur(${interpolate(l2, [0, 1], [14, 0], OUT)}px)`,
            ...F,
            textShadow: `${shadow}, 0 0 36px rgba(233,185,73,0.4)`,
          }}
        >
          {line2}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Pregunta de retención. Misma franja y misma escala que todo lo demás. */
export const QuestionCaption: React.FC<{ hold: number; text: string; sub: string }> = ({
  hold,
  text,
  sub,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 14, mass: 0.6, stiffness: 150 } });
  const exit = interpolate(frame, [hold - 9, hold], [1, 0], OUT);
  const blink = Math.floor((frame / fps) * 2) % 2 === 0;
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.x0,
        width: SAFE.x1 - SAFE.x0,
        top: PANEL.top + 60,
        textAlign: "center",
        opacity: p * exit,
        transform: `translateY(${interpolate(p, [0, 1], [26, 0])}px) scale(${interpolate(p, [0, 1], [0.93, 1])})`,
        fontFamily,
      }}
    >
      <div
        style={{
          display: "inline-block",
          background: "rgba(9,11,14,0.92)",
          border: `3px solid ${COLORS.coral}`,
          borderRadius: 18,
          padding: `${SP.lg}px ${SP.xl}px`,
          boxShadow: "0 18px 50px -14px rgba(0,0,0,0.85)",
        }}
      >
        <div
          style={{
            font: `700 ${TYPE.body}px/1.12 ${fontFamily}`,
            color: COLORS.coral,
            textTransform: "uppercase",
            letterSpacing: "-0.02em",
            ...F,
          }}
        >
          {text}
        </div>
        <div
          style={{
            font: `600 ${TYPE.chip}px/1.2 ${fontFamily}`,
            color: COLORS.beige,
            textTransform: "uppercase",
            marginTop: SP.sm,
          }}
        >
          {sub} {blink ? "👇" : "👇 _"}
        </div>
      </div>
    </div>
  );
};
