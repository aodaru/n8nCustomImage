import React from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";
import { COLORS, SAFE } from "./tokens";

const { fontFamily } = loadFont("normal", {
  weights: ["500", "600", "700"],
  subsets: ["latin"],
  ignoreTooManyRequestsWarning: true,
});

const OUT = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

/**
 * EL HOOK. Es un mensaje directo entrando: el vídeo abre con "me han preguntado
 * varias veces…", así que en vez de una tarjeta que lo cuente, se ENSEÑA la
 * pregunta llegando — con la coreografía completa de la app: cabecera, puntos
 * de "escribiendo", la burbuja, una reacción y el "visto".
 *
 * ARRANCA EN y=975 porque en el encuadre de referencia la barbilla está en 890.
 * MIDE LA TUYA: el bloque entero tiene que caer por debajo.
 *
 * No lleva usuario ni foto de perfil: es un mensaje anónimo, no la cuenta de
 * nadie. Y es lo único del vídeo que NO va en versales — un DM en mayúsculas no
 * se lee como un DM.
 */
const TOP = 975;

export const DirectMessage: React.FC<{ hold: number }> = ({ hold }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // coreografía, en frames
  const HEAD_AT = 0;
  const TYPING_AT = 7;
  const MSG_AT = 26;
  const REACT_AT = 48;
  const META_AT = 56;

  const exit = interpolate(frame, [hold - 12, hold], [0, 1], {
    ...OUT,
    easing: Easing.in(Easing.cubic),
  });
  const scrim = interpolate(frame, [0, 8], [0, 1], OUT) * (1 - exit);

  const sp = (d: number, damping = 15, stiffness = 150) =>
    spring({ frame: frame - d, fps, config: { damping, mass: 0.7, stiffness } });

  const head = sp(HEAD_AT, 18);
  const av = sp(TYPING_AT);
  const typing = sp(TYPING_AT) * (1 - interpolate(frame, [MSG_AT - 3, MSG_AT], [0, 1], OUT));
  const msg = sp(MSG_AT, 12, 165);
  const react = sp(REACT_AT, 10, 190);
  const meta = sp(META_AT);

  const Bubble: React.FC<{ children: React.ReactNode; p: number; pad: string }> = ({
    children,
    p,
    pad,
  }) => (
    <div
      style={{
        alignSelf: "flex-start",
        position: "relative",
        background: "#262628",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: 30,
        borderBottomLeftRadius: 10,
        padding: pad,
        boxShadow: "0 18px 46px -14px rgba(0,0,0,0.9)",
        opacity: p,
        // nace desde la esquina del avatar, como en la app
        transform: `translateY(${interpolate(p, [0, 1], [22, 0])}px) scale(${interpolate(
          p,
          [0, 1],
          [0.86, 1],
        )})`,
        transformOrigin: "0% 100%",
      }}
    >
      {children}
    </div>
  );

  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 905,
          bottom: 0,
          opacity: scrim,
          background:
            "linear-gradient(to bottom, transparent 0%, rgba(9,11,14,0.86) 18%, rgba(9,11,14,0.95) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: SAFE.x0,
          width: SAFE.x1 - SAFE.x0,
          top: TOP,
          fontFamily,
          opacity: 1 - exit,
          transform: `translateY(${-exit * 26}px)`,
        }}
      >
        {/* cabecera de bandeja: logo + etiqueta + regla que se dibuja */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, opacity: head }}>
          <Img
            src={staticFile("logos/instagram.svg")}
            style={{
              width: 40,
              height: 40,
              transform: `scale(${interpolate(head, [0, 1], [0.5, 1])})`,
            }}
          />
          <div
            style={{
              font: `700 26px/1 ${fontFamily}`,
              color: COLORS.gold,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            mensaje directo
          </div>
          <div
            style={{
              flex: 1,
              height: 2,
              background: "rgba(140,130,114,0.45)",
              transform: `scaleX(${head})`,
              transformOrigin: "0% 50%",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 20, alignItems: "flex-end", marginTop: 26 }}>
          {/* avatar anónimo: aro degradado + silueta, sin foto ni nombre */}
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 99,
              flexShrink: 0,
              background: "linear-gradient(135deg, #f0704f 0%, #e9b949 45%, #8c8272 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: av,
              transform: `scale(${interpolate(av, [0, 1], [0.7, 1])})`,
            }}
          >
            <div
              style={{
                width: 82,
                height: 82,
                borderRadius: 99,
                background: "#1b1b1d",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="44" height="44" viewBox="0 0 24 24" fill="rgba(239,231,214,0.55)">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" />
              </svg>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
            {typing > 0.01 ? (
              <div style={{ position: "absolute" }}>
                <Bubble p={typing} pad="30px 34px">
                  <div style={{ display: "flex", gap: 12 }}>
                    {[0, 1, 2].map((i) => {
                      // los tres puntos laten desfasados, como en la app
                      const t = ((frame - TYPING_AT) / fps) * 2.6 - i * 0.22;
                      const o = 0.35 + 0.65 * Math.max(0, Math.sin(t * Math.PI * 2));
                      return (
                        <span
                          key={i}
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: 99,
                            background: "rgba(239,231,214,0.9)",
                            opacity: o,
                          }}
                        />
                      );
                    })}
                  </div>
                </Bubble>
              </div>
            ) : null}

            <Bubble p={msg} pad="28px 34px">
              <div
                style={{
                  font: `500 52px/1.28 ${fontFamily}`,
                  color: "#F4F1EA",
                  letterSpacing: "-0.01em",
                  maxWidth: 700,
                }}
              >
                {/* EJEMPLO: cámbialo por la pregunta real que te hacen */}
                oye, ¿los videos tuyos{" "}
                <span style={{ color: COLORS.gold, fontWeight: 700 }}>los edita una ia</span>?
              </div>
              {/* reacción: entra con rebote pegada al borde inferior, como la app */}
              <div
                style={{
                  position: "absolute",
                  right: 26,
                  bottom: -22,
                  background: "#1b1b1d",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 99,
                  padding: "6px 14px",
                  font: `500 30px/1 ${fontFamily}`,
                  opacity: react,
                  transform: `scale(${interpolate(react, [0, 1], [0.3, 1])}) rotate(${interpolate(
                    react,
                    [0, 1],
                    [-24, 0],
                  )}deg)`,
                  boxShadow: "0 10px 26px -8px rgba(0,0,0,0.9)",
                }}
              >
                🔥
              </div>
            </Bubble>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 30,
                marginLeft: 6,
                opacity: meta,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 99,
                  background: COLORS.green,
                  boxShadow: `0 0 10px ${COLORS.green}`,
                }}
              />
              <span
                style={{
                  font: `500 26px/1 ${fontFamily}`,
                  color: "rgba(239,231,214,0.5)",
                }}
              >
                visto · ahora
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
