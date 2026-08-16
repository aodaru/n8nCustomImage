import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";
import { COLORS, SAFE } from "./tokens";
import { OUT, useIn, wipe } from "./motion";

const { fontFamily } = loadFont("normal", {
  weights: ["500", "600", "700"],
  subsets: ["latin"],
  ignoreTooManyRequestsWarning: true,
});

/**
 * MARCA DE CAPÍTULO.
 *
 * Lo habitual sería una carta de capítulo a pantalla completa con wipe. Aquí eso es imposible: durante 105 de los 124 segundos hay una captura
 * de pantalla o un terminal que no se puede tapar. Así que el capítulo es una
 * PÍLDORA de una sola línea que se coloca exactamente donde iría el karaoke de
 * ese montaje — se lee como un relevo, no como una capa más.
 *
 * Y sustituye a las dos cosas que se quitaron: el destello blanco entre
 * secciones y la barra de progreso. El espectador sigue sabiendo dónde está,
 * pero por el contenido, no por un widget.
 */
export const ChapterMark: React.FC<{
  num: string;
  title: string;
  /** centro vertical: 1090 a cámara, 1170 sobre la pantalla, 895 en la costura */
  y: number;
  hold: number;
  /** marca del capítulo cuando el tramo va de una herramienta concreta */
  logo?: string;
}> = ({ num, title, y, hold, logo }) => {
  const frame = useCurrentFrame();
  const bar = useIn(0, 18, 170);
  const n = useIn(4, 15);
  const t = useIn(8, 16);
  // La salida NO es la entrada al revés: la píldora se cierra hacia la
  // izquierda y se va, en vez de desvanecerse en el sitio.
  const exit = interpolate(frame, [hold - 12, hold], [0, 1], OUT);

  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.x0,
        width: SAFE.x1 - SAFE.x0,
        top: y - 46,
        fontFamily,
        display: "flex",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 20,
          background: "rgba(9,11,14,0.9)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(140,130,114,0.35)",
          borderRadius: 14,
          padding: "16px 26px",
          boxShadow: "0 16px 44px -14px rgba(0,0,0,0.9)",
          clipPath: wipe(1 - exit, "left"),
          transform: `translateX(${-exit * 30}px)`,
        }}
      >
        <div
          style={{
            width: 58,
            height: 5,
            borderRadius: 3,
            background: COLORS.gold,
            transform: `scaleX(${bar})`,
            transformOrigin: "0% 50%",
            flexShrink: 0,
          }}
        />
        <div
          style={{
            font: `700 40px/1 ${fontFamily}`,
            color: COLORS.gold,
            letterSpacing: "-0.01em",
            clipPath: wipe(n, "down"),
          }}
        >
          {num}
        </div>
        {logo ? (
          <Img
            src={staticFile(`logos/${logo}`)}
            style={{
              width: 38,
              height: 38,
              opacity: t,
              transform: `scale(${0.55 + 0.45 * t}) rotate(${(1 - t) * -40}deg)`,
            }}
          />
        ) : (
          <div style={{ width: 6, height: 6, borderRadius: 99, background: "rgba(140,130,114,0.7)", opacity: t }} />
        )}
        <div
          style={{
            font: `700 40px/1 ${fontFamily}`,
            color: COLORS.beige,
            textTransform: "uppercase",
            letterSpacing: "-0.02em",
            whiteSpace: "nowrap",
            clipPath: wipe(t, "left"),
          }}
        >
          {title}
        </div>
      </div>
    </div>
  );
};
