import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const OUT = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

/** Muelle estándar del proyecto: un único carácter de movimiento para todo. */
export const useIn = (delay: number, damping = 16, stiffness = 155) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, mass: 0.7, stiffness } });
};

type Dir = "left" | "right" | "up" | "down";

/** `inset()` de barrido. Un texto que se DESTAPA lee mejor que uno que aparece. */
export const wipe = (p: number, dir: Dir = "left") => {
  const v = Math.max(0, (1 - p) * 100);
  if (dir === "left") return `inset(0 ${v}% 0 0)`;
  if (dir === "right") return `inset(0 0 0 ${v}%)`;
  if (dir === "up") return `inset(${v}% 0 0 0)`;
  return `inset(0 0 ${v}% 0)`;
};

/**
 * REVEAL — barrido con clip-path + un empuje corto en la dirección contraria.
 * Es la entrada base de todo el vídeo: sustituye al fade+translate anterior,
 * que se leía plano.
 */
export const Reveal: React.FC<{
  d: number;
  dir?: Dir;
  shift?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ d, dir = "left", shift = 26, style, children }) => {
  const p = useIn(d);
  const axis = dir === "left" || dir === "right" ? "X" : "Y";
  const sign = dir === "left" || dir === "up" ? -1 : 1;
  return (
    <div
      style={{
        clipPath: wipe(p, dir),
        transform: `translate${axis}(${interpolate(p, [0, 1], [sign * shift, 0])}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/**
 * Texto que entra letra a letra con desenfoque. Se usa solo donde importa —
 * la palabra que hay que comentar y los remates —, no en cada fila: escalonar
 * todo convierte el reel en un festival de tipografía.
 */
export const CharStagger: React.FC<{
  text: string;
  d: number;
  per?: number;
  style?: React.CSSProperties;
}> = ({ text, d, per = 1.4, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <span style={style}>
      {text.split("").map((c, i) => {
        if (c === " ") return <span key={i}>&nbsp;</span>;
        const p = spring({
          frame: frame - d - i * per,
          fps,
          config: { damping: 14, mass: 0.6, stiffness: 170 },
        });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: p,
              filter: `blur(${interpolate(p, [0, 1], [9, 0], OUT)}px)`,
              transform: `translateY(${interpolate(p, [0, 1], [22, 0])}px)`,
            }}
          >
            {c}
          </span>
        );
      })}
    </span>
  );
};

/**
 * Trazo que se DIBUJA (stroke-dashoffset). Para reglas, flechas y el arco de
 * retorno del bucle: una línea que crece lee como causa, una que aparece no.
 */
export const DrawPath: React.FC<{
  d: number;
  path: string;
  len: number;
  stroke: string;
  width?: number;
  dur?: number;
  markerEnd?: string;
}> = ({ d, path, len, stroke, width = 3, dur = 14, markerEnd }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [d, d + dur], [0, 1], OUT);
  return (
    <path
      d={path}
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      strokeDasharray={len}
      strokeDashoffset={len * (1 - p)}
      markerEnd={markerEnd}
      opacity={p > 0.001 ? 1 : 0}
    />
  );
};

/** Cifra que sube hasta su valor. Se redondea por frame: nada de decimales. */
export const CountUp: React.FC<{ d: number; to: number; dur?: number; suffix?: string }> = ({
  d,
  to,
  dur = 20,
  suffix = "",
}) => {
  const frame = useCurrentFrame();
  const v = interpolate(frame, [d, d + dur], [0, to], { ...OUT, easing: (x) => 1 - (1 - x) ** 3 });
  return (
    <>
      {Math.round(v)}
      {suffix}
    </>
  );
};
