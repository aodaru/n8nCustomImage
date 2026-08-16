// ─────────────────────────────────────────────────────────────────────────────
// TOKENS — el ÚNICO archivo que tocas para cambiar el look.
// Todo lo demás (paneles, captions, capítulos, motion) lee de aquí.
// ─────────────────────────────────────────────────────────────────────────────
export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

/**
 * DURACIÓN. `CUT_S` es el segundo en que se corta la voz; a partir de ahí el
 * frame se congela. Si tu take ya termina con un CTA hablado, deja `TAIL_S`
 * corto y no pongas tarjeta de cierre: sobra.
 */
export const CUT_S = 60; // ← el final de tu clip
export const TAIL_S = 0.5;
export const DUR_S = CUT_S + TAIL_S;
export const DUR_F = Math.round(DUR_S * FPS);

/** Paleta cálida. Cambia estos siete valores y cambia el vídeo entero. */
export const COLORS = {
  beige: "#EFE7D6", // base de subtítulos
  cream: "#FBF6EA", // resalte claro
  gold: "#E9B949", // palabra activa / acento
  green: "#5FBF7A", // positivo
  coral: "#F0704F", // negativo
  ink: "#14110C",
  line: "#8C8272",
} as const;

/**
 * DANGER ZONES — unión de TikTok + Instagram Reels, caso peor de cada lado.
 * TikTok sube mucho por abajo; Reels muerde arriba y a la derecha.
 * No las toques salvo que publiques en una sola plataforma.
 */
export const DZ = { top: 250, bottom: 500, left: 70, right: 140 } as const;

export const SAFE = {
  x0: DZ.left,
  x1: WIDTH - DZ.right,
  y0: DZ.top,
  y1: HEIGHT - DZ.bottom,
} as const;

/**
 * ══ LO QUE TIENES QUE MEDIR EN TU MATERIAL ══
 *
 * Corre `scripts/medir.sh <video>` y mira los frames con regla. Necesitas:
 *
 *  · barbilla del sujeto en los planos a cámara  → nada informativo por encima
 *  · si hay pantalla partida: dónde acaba la captura y dónde empieza la cabeza
 *  · si hay plano de pantalla: qué franja NO tiene contenido que leer
 *
 * Los valores de abajo son los de un encuadre de referencia (cara en y 300-890,
 * captura hasta 898, cabeza desde 1010). CÁMBIALOS. Si no los cambias, el reel
 * le tapará la cara a alguien.
 */

/** Centro vertical del karaoke en cada montaje. */
export const CAPTION_CY = 1120; // plano a cámara: entre barbilla y manos
export const CAPTION_CY_SCREEN = 1200; // plano de pantalla: sobre la zona muerta
export const CAPTION_CY_SEAM = 925; // pantalla partida: en la costura

/**
 * FRANJA DE DATOS del plano a cámara. Los paneles se anclan ABAJO y crecen
 * hacia arriba: con altura fija, un panel de dos filas deja media caja vacía.
 * `top` es el techo duro — nada informativo lo cruza.
 */
export const PANEL = {
  top: 880, // ← la barbilla
  maxHeight: 540,
  bottom: HEIGHT - 1420, // el suelo es la danger zone de abajo
} as const;

/**
 * FRANJA DE DATOS de la pantalla partida. Vive en la costura: empieza donde
 * acaba el contenido útil de la captura (su barra de estado es cromo, se puede
 * tapar) y termina antes de la cabeza.
 */
export const SEAM = { top: 790, maxHeight: 265 } as const;

/**
 * Escala tipográfica ÚNICA. Sin esto cada gráfico elige su tamaño y el conjunto
 * deja de leerse como un sistema. Estos seis valores son los únicos permitidos.
 */
export const TYPE = {
  eyebrow: 26, // cintillo del panel
  chip: 26,
  body: 42, // filas de lista
  title: 54,
  display: 84, // cifras
  hero: 108, // remate a pantalla
} as const;

/** Espaciado en múltiplos de 6 — mismo ritmo vertical en todos los paneles. */
export const SP = { xs: 6, sm: 12, md: 18, lg: 24, xl: 36 } as const;
