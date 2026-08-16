import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

/**
 * MÁSCARAS DE PRIVACIDAD.
 *
 * Si en algún plano se ve tu pantalla, casi seguro se ve algo que no querías
 * publicar: una bandeja de correo, nombres de clientes, tarifas, tokens, rutas.
 * Esto lo tapa sin matar la demo.
 *
 * DESENFOQUE, NO CAJAS OPACAS. A 1080p un blur de 15-18px destruye texto de
 * 12-14px y aun así deja ver el MOVIMIENTO — que muchas veces ES la demo
 * ("muevo esto aquí y se mueve allá"). Una caja negra la mata.
 *
 * ══ CÓMO SACAR LAS COORDENADAS (y los cuatro errores que se pagan caro) ══
 *
 * 1. MIDE EN NATIVO, no sobre miniaturas. Recorta la zona a tamaño real
 *    (`ffmpeg -vf "crop=1080:420:0:380"`) y míralo. Medir sobre un thumb de
 *    270px te puede desviar 400 píxeles.
 * 2. EL DEGRADADO DEL BORDE se come 26px de desenfoque en cada extremo (está
 *    para que no parezca una barra de censura). La caja tiene que pasarse del
 *    texto esa cantidad. Y las que llegan al borde del cuadro: estíralas fuera
 *    (hasta y=2000) o dejan una franja nítida abajo.
 * 3. LA CÁMARA A MANO no se sigue con una caja centrada: al derivar aparece
 *    contenido pegado al borde. O ancho completo, o `rects`→`rectsEnd`. Y ojo:
 *    si la ventana se queda quieta y luego salta, interpolar la POSICIÓN la
 *    adelanta y deja renglones al aire — ancla la caja y hazla CRECER.
 * 4. LOS BARRIDOS DE CÁMARA van a cuadro completo. Los monitores cruzan en
 *    diagonal y ninguna caja fija los sigue. Recortado al giro real (0.5-0.7s)
 *    no se nota: ya viene con motion blur.
 *
 * VERIFICA SIEMPRE SOBRE EL ARCHIVO FINAL, con recortes nativos de las bandas
 * límite. Nunca sobre el still escalado del render.
 */
export type Rect = [number, number, number, number];
export type Mask = {
  from: number;
  to: number;
  rects: Rect[] | "full";
  /** Si está, cada caja se interpola linealmente de `rects` a `rectsEnd`: la
   *  cámara va a mano y el terminal se desplaza dentro del plano. */
  rectsEnd?: Rect[];
};

/**
 * [x, y, ancho, alto] en píxeles de la composición.
 * Esta tabla es UN EJEMPLO de un caso real, para que veas la forma. Bórrala y
 * pon las tuyas: no hay dos encuadres iguales.
 */
export const MASKS: Mask[] = [
  // plano general del escritorio: la ventana con datos deriva con la cámara,
  // así que la caja se ancla arriba-izquierda y CRECE (ver punto 3 de arriba).
  // La segunda caja es el monitor de abajo, que llega al borde del cuadro.
  {
    from: 18.4,
    to: 21.8,
    rects: [[250, 300, 600, 470], [0, 1380, 1080, 620]],
    rectsEnd: [[250, 300, 830, 600], [0, 1380, 1080, 620]],
  },
  // barrido de cámara: los monitores salen por la derecha
  { from: 21.8, to: 22.5, rects: [[640, 180, 440, 1820]] },
  // primer plano de un objeto: solo asoma una pantalla abajo
  { from: 22.5, to: 24.8, rects: [[0, 1430, 1080, 570]] },
  // barrido de vuelta: cruza casi todo el cuadro
  { from: 24.8, to: 25.25, rects: [[180, 140, 900, 1860]] },
  // plano fijo con la parte de arriba ya limpia
  { from: 25.25, to: 29.3, rects: [[0, 1340, 1080, 660]] },
  // primer plano del monitor: hay texto arriba Y abajo, pero entre los dos
  // queda una franja limpia que se deja nítida (ahí está lo que enseña)
  { from: 29.3, to: 34.5, rects: [[165, 200, 690, 600], [0, 1120, 1080, 880]] },
];

const Region: React.FC<{ rect: [number, number, number, number] | "full"; a: number }> = ({
  rect,
  a,
}) => {
  const full = rect === "full";
  const [x, y, w, h] = full ? [0, 0, 0, 0] : (rect as [number, number, number, number]);
  return (
    <div
      style={{
        position: "absolute",
        ...(full ? { inset: 0 } : { left: x, top: y, width: w, height: h }),
        // el blur sube con la opacidad: entrar de golpe se lee como un glitch
        backdropFilter: `blur(${(full ? 18 : 17) * a}px) saturate(${1 - 0.25 * a})`,
        WebkitBackdropFilter: `blur(${(full ? 18 : 17) * a}px)`,
        background: `rgba(9,11,14,${0.14 * a})`,
        // bordes difuminados para que no se lea como una barra de censura
        WebkitMaskImage: full
          ? undefined
          : "linear-gradient(to bottom, transparent 0, black 26px, black calc(100% - 26px), transparent 100%)",
        pointerEvents: "none",
      }}
    />
  );
};

export const PrivacyMasks: React.FC<{ fps: number }> = ({ fps }) => {
  const frame = useCurrentFrame();
  const t = frame / fps;
  const active = MASKS.filter((m) => t >= m.from - 0.25 && t < m.to + 0.25);
  if (!active.length) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {active.map((m) => {
        const a =
          interpolate(t, [m.from - 0.2, m.from], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }) *
          interpolate(t, [m.to, m.to + 0.2], [1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
        if (a <= 0.001) return null;
        if (m.rects === "full") return <Region key={`${m.from}-full`} rect="full" a={a} />;
        // progreso dentro de la ventana, para seguir la deriva de la cámara
        const k = Math.min(1, Math.max(0, (t - m.from) / (m.to - m.from)));
        return m.rects.map((r, i) => {
          const e = m.rectsEnd?.[i];
          const rect = (e ? (r.map((v, j) => v + (e[j] - v) * k) as Rect) : r) as Rect;
          return <Region key={`${m.from}-${i}`} rect={rect} a={a} />;
        });
      })}
    </AbsoluteFill>
  );
};
