import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  Sequence,
  Freeze,
  staticFile,
  useVideoConfig,
} from "remotion";
import type { Caption } from "@remotion/captions";
import { Captions } from "./Captions";
import { Grade, SafeGuides } from "./overlays";
import { BandPanel, ChainPanel } from "./panels";
import { SeamPanel, SeamChips, SeamVersus, SeamOffer, SeamTrade, SeamLoop } from "./seam";
import { ChapterMark } from "./chapters";
import { DirectMessage } from "./dm";
import { PrivacyMasks } from "./privacy";
import {
  CAPTION_CY,
  CAPTION_CY_SCREEN,
  CAPTION_CY_SEAM,
  COLORS,
  CUT_S,
  FPS,
} from "./tokens";
import captionsData from "../../public/captions.json";

const CAPS = captionsData as Caption[];

const f = (sec: number) => Math.round(sec * FPS);
/** Retardo, en frames, de un instante absoluto respecto al inicio de un tramo. */
const at = (sec: number, start: number) => Math.round((sec - start) * FPS);

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * ESTE ARCHIVO ES EL GUION. Todo lo demás son piezas; aquí se decide QUÉ sale y
 * CUÁNDO. Sácalo de `scripts/medir.sh` + el transcript, no a ojo.
 * ═════════════════════════════════════════════════════════════════════════════
 */

/** Fronteras del montaje que ya trae el material (detección de escena). */
const S_SCREEN = 18.5; // entra un plano de pantalla
const S_FACE2 = 34.45; // vuelve a cámara
const S_SPLIT = 46.3; // empieza la pantalla partida

/**
 * EL VÍDEO VA A ESCALA 1:1, sin punch-ins ni reencuadres.
 *
 * En un talking-head puro conviene un pulso de cámara por beat (scale 1.03↔1.24
 * con el origen calculado para que la barbilla no baje del techo del panel).
 * Pero si el material tiene capturas de pantalla, NO: cualquier zoom recorta lo
 * que hay que leer. El footage ES la infografía y manda sobre el ritmo.
 */
const Plate: React.FC = () => (
  <AbsoluteFill>
    <OffthreadVideo
      src={staticFile("video.mp4")}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  </AbsoluteFill>
);

/**
 * PANELES DE LOS TRAMOS A CÁMARA — viven bajo la barbilla y nunca la cruzan.
 *
 * ⚠ AUDITA CADA UNO CONTRA EL TRANSCRIPT DE ESE SEGUNDO. Una tarjeta que repite
 * lo que se está oyendo no aporta nada y encima compite con el subtítulo. Cada
 * tarjeta tiene que dar UNA de estas tres cosas:
 *   · CONTRASTE  — dos columnas: qué es una cosa frente a la otra
 *   · CONSECUENCIA — el "por lo tanto" que el autor deja implícito
 *   · DATO DERIVADO — algo contado a partir de su propia lista
 */
const PANELS = [
  {
    start: 5.2,
    end: 10.5,
    id: "reencuadre",
    render: (h: number) => (
      <BandPanel
        hold={h}
        kicker="de qué va esto de verdad"
        rows={[
          { text: "no es aprender a editar", d: at(5.6, 5.2), tone: COLORS.beige },
          { text: "es no tener que aprender", d: at(8.5, 5.2), tone: COLORS.beige },
        ]}
      />
    ),
  },
  {
    // Cadena de consecuencia. Si un paso empieza por un número, `ChainPanel` lo
    // hace subir con una cuenta ascendente en vez de aparecer.
    start: 13.4,
    end: 18.4,
    id: "cuenta",
    render: (h: number) => (
      <ChainPanel
        hold={h}
        kicker="la cuenta de este video"
        accent={COLORS.gold}
        steps={[
          { t: "10 min hablando a cámara", d: at(13.8, 13.4) },
          { t: "15 min de máquina", d: at(15.6, 13.4) },
          { t: "un video listo", d: at(17.2, 13.4) },
        ]}
      />
    ),
  },
];

/**
 * TARJETAS DE LA COSTURA — para los tramos de pantalla partida. Compactas: solo
 * disponen de la franja entre el pie de la captura y la cabeza.
 */
const SEAMS = [
  {
    start: 49.6,
    end: 55.8,
    id: "sin",
    render: (h: number) => (
      <SeamPanel hold={h} kicker="lo que no hay en este flujo">
        <SeamChips
          chips={[
            { text: "sin timeline", d: at(50.6, 49.6) },
            { text: "sin keyframes", d: at(52.0, 49.6) },
            { text: "sin exportar a mano", d: at(53.6, 49.6) },
          ]}
        />
      </SeamPanel>
    ),
  },
  {
    // chips con marca: `logo` para las que tienen símbolo limpio, `mono` para
    // las que no (mejor un monograma que una fila con un hueco)
    start: 62.6,
    end: 68.6,
    id: "herramientas",
    render: (h: number) => (
      <SeamPanel hold={h} kicker="no estás atado a una herramienta">
        <SeamChips
          chips={[
            { text: "Claude Code", d: at(63.0, 62.6), logo: "claude.svg" },
            { text: "Codex", d: at(64.9, 62.6), logo: "openai.svg" },
            { text: "Kimi Code", d: at(65.9, 62.6), mono: "K" },
          ]}
        />
      </SeamPanel>
    ),
  },
  {
    // el trueque implícito: lo que antes costaba tiempo ahora cuesta otra cosa
    start: 57.4,
    end: 62.3,
    id: "trueque",
    render: (h: number) => (
      <SeamTrade
        hold={h}
        kicker="el coste cambió de sitio"
        before={{ label: "antes lo pagabas con", value: "tu tarde" }}
        after={{ label: "ahora lo pagas con", value: "tokens" }}
        atAfter={at(59.6, 57.4)}
      />
    ),
  },
  {
    // Si el autor dice de viva voz una palabra que hay que TECLEAR, esta tarjeta
    // no la repite: la deja legible. Es lo único que un karaoke a tres palabras
    // no consigue.
    start: 76.2,
    end: 80.4,
    id: "oferta",
    render: (h: number) => (
      <SeamOffer
        hold={h}
        kicker="coméntalo y te la mando"
        word="edición de video"
        sub="la skill completa"
      />
    ),
  },
  {
    // un proceso que se repite: el arco de vuelta es lo que lo convierte en
    // bucle, y casi nunca se dice con esa palabra
    start: 83.4,
    end: 92.2,
    id: "bucle",
    render: (h: number) => (
      <SeamLoop
        hold={h}
        kicker="lo que hace mientras tanto"
        steps={[
          { t: "renderiza", d: at(83.9, 83.4) },
          { t: "captura", d: at(85.0, 83.4) },
          { t: "compara", d: at(86.6, 83.4) },
          { t: "corrige", d: at(88.2, 83.4) },
        ]}
        loopAt={at(89.7, 83.4)}
        loopLabel="y vuelve a empezar"
      />
    ),
  },
  {
    // recap de cierre. Es la única tarjeta que puede reflejar una lista del
    // autor: sostiene a la vez seis cosas que él suelta en catorce segundos, y
    // eso el habla no lo puede hacer. Cada ítem entra en el frame en que lo
    // nombra, así que nunca va por delante de su voz.
    start: 100.5,
    end: 114.6,
    id: "balance",
    render: (h: number) => (
      <SeamVersus
        hold={h}
        kicker="el balance, con sus propias cuentas"
        left={{
          head: "lo bueno",
          items: [
            { t: "tiempo", d: at(100.9, 100.5) },
            { t: "edición constante", d: at(101.3, 100.5) },
            { t: "conveniencia", d: at(102.5, 100.5) },
          ],
        }}
        right={{
          head: "lo malo",
          items: [
            { t: "cuesta en tokens", d: at(104.0, 100.5) },
            { t: "no con la cuenta básica", d: at(105.9, 100.5) },
            { t: "10-20 min por video", d: at(109.2, 100.5) },
          ],
        }}
      />
    ),
  },
];

/**
 * CAPÍTULOS. Sustituyen a las dos cosas que se caen en cuanto las miras dos
 * veces: el destello blanco entre secciones y la barra de progreso (genérica).
 * Cada marca se coloca a la altura del karaoke del montaje en el que cae, para
 * no invadir ni la cara ni la pantalla.
 */
const CHAPTER_LEN = 1.6;
const CHAPTERS: { at: number; num: string; title: string; y: number; logo?: string }[] = [
  { at: 18.6, num: "01", title: "cómo grabo", y: CAPTION_CY_SCREEN - 30, logo: "obs.png" },
  { at: 34.6, num: "02", title: "la skill", y: CAPTION_CY - 30 },
  { at: 46.5, num: "03", title: "la edición", y: CAPTION_CY_SEAM - 30 },
  { at: 98.8, num: "04", title: "bueno y malo", y: CAPTION_CY_SEAM - 30 },
];

export const Reel: React.FC<{ debugSafe?: boolean }> = ({ debugSafe = false }) => {
  const { fps } = useVideoConfig();

  // Cuando manda un gráfico, el karaoke se retira: dos tipografías compitiendo
  // por el mismo beat es lo que hace que un reel se sienta ruidoso. Los 150ms
  // de cola evitan que reaparezca uno o dos frames entre overlays seguidos.
  const hide: [number, number][] = [
    ...PANELS.map((p) => [p.start * 1000 - 150, p.end * 1000] as [number, number]),
    ...SEAMS.map((p) => [p.start * 1000 - 150, p.end * 1000] as [number, number]),
    ...CHAPTERS.map(
      (c) => [c.at * 1000 - 150, (c.at + CHAPTER_LEN) * 1000 + 200] as [number, number],
    ),
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Sequence durationInFrames={f(CUT_S)}>
        <Plate />
      </Sequence>
      {/* a partir del corte el frame se congela: si el vídeo siguiera se le
          vería mover la boca sin voz */}
      <Sequence from={f(CUT_S)}>
        <Freeze frame={f(CUT_S) - 1}>
          <Plate />
        </Freeze>
      </Sequence>

      {/* ANTES del grado y de los textos: difumina el vídeo, no los overlays */}
      <PrivacyMasks fps={fps} />

      <Grade />

      {/* Un montaje, un sitio para el karaoke. Ver tokens.ts. */}
      <Captions
        captions={CAPS}
        cy={CAPTION_CY}
        size={84}
        maxWords={3}
        show={[
          [3250, S_SCREEN * 1000],
          [S_FACE2 * 1000, S_SPLIT * 1000],
        ]}
        hide={hide}
      />
      <Captions
        captions={CAPS}
        cy={CAPTION_CY_SCREEN}
        size={56}
        band
        maxWords={3}
        show={[[S_SCREEN * 1000, S_FACE2 * 1000]]}
        hide={hide}
      />
      <Captions
        captions={CAPS}
        cy={CAPTION_CY_SEAM}
        size={56}
        band
        maxWords={3}
        show={[[S_SPLIT * 1000, CUT_S * 1000]]}
        hide={hide}
      />

      {/* HOOK — los 3s que deciden si se quedan. Si el vídeo abre respondiendo a
          una pregunta del público, ENSÉÑALA llegando en vez de contarla. */}
      <Sequence from={0} durationInFrames={f(3.2)}>
        <DirectMessage hold={f(3.2)} />
      </Sequence>

      {CHAPTERS.map((c) => (
        <Sequence key={c.num} from={f(c.at)} durationInFrames={f(CHAPTER_LEN)}>
          <ChapterMark num={c.num} title={c.title} y={c.y} hold={f(CHAPTER_LEN)} logo={c.logo} />
        </Sequence>
      ))}

      {PANELS.map((p) => (
        <Sequence key={p.id} from={f(p.start)} durationInFrames={f(p.end - p.start)}>
          {p.render(f(p.end - p.start))}
        </Sequence>
      ))}

      {SEAMS.map((p) => (
        <Sequence key={p.id} from={f(p.start)} durationInFrames={f(p.end - p.start)}>
          {p.render(f(p.end - p.start))}
        </Sequence>
      ))}

      {/* pon debugSafe en true para ver las danger zones y la caja segura */}
      {debugSafe && <SafeGuides />}
    </AbsoluteFill>
  );
};
