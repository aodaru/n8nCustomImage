---
name: edicion-de-video
description: Convierte una grabación cruda de talking-head (con o sin capturas de pantalla) en un reel vertical 9:16 listo para Instagram/TikTok — corta los silencios, transcribe con tiempos por palabra, mapea el footage, monta subtítulos karaoke y tarjetas de datos sobre Remotion, tapa lo que no debe publicarse, mezcla música y efectos con la voz por delante y exporta a la spec de Reels. Úsala cuando alguien pida editar un video para redes, montar un reel, ponerle subtítulos y gráficos a una grabación, o empaquetar un screencast como pieza corta.
---

# Edición de video con IA

Pipeline completo, de la grabación al MP4 que se sube. Está pensada para
**talking-head grabado en una sola toma**, con o sin capturas de pantalla
intercaladas. Sale un 9:16 a 1080×1920, 30fps, −14 LUFS.

No es un generador: es un método. Las decisiones que importan —dónde va cada
tarjeta, qué dice, qué se tapa— salen de MEDIR el material, no de una plantilla.

## Regla de oro

**Ninguna tarjeta repite lo que se está oyendo.** Es el error que más se comete
y el que más rápido se nota: el espectador ya lo está leyendo en el subtítulo, y
la tarjeta solo compite. Cada tarjeta tiene que aportar una de estas tres cosas:

| aporte | qué es | ejemplo |
|---|---|---|
| **contraste** | dos columnas: esto frente a lo otro | *un bot / un sistema* |
| **consecuencia** | el "por lo tanto" que el autor deja implícito | *mismo servicio → compites por precio → el precio baja* |
| **dato derivado** | algo contado a partir de su propia lista | *3 de 4 se cobran todos los meses* |

Antes de renderizar, audita CADA tarjeta contra el transcript de ese segundo.
Si al leerla en voz alta suena igual que lo que él dice ahí, va fuera.

Y **no inventes cifras** (tarifas, plazos, porcentajes) para rellenar una
tarjeta: se publican como si fueran suyas. Si no las dijo, pregunta; si no hay
respuesta, la tarjeta se queda cualitativa.

## El orden

### 1 · Preparar el material — `scripts/prep.sh <video>`

Hace la ficha, decide si hay que cortar silencios, corta, reencodea a 30fps y
saca el audio.

**Sobre el corte de silencios**, que es la mitad del valor de esto:

- `auto-editor <in> --margin 0.2sec -o clean.mp4`. Ese margen está probado: no
  se come los ataques de palabra. Si se pide "lo más fluido posible", 0.1s
  también aguanta.
- **Sin `--video-speed`.** Acelerar el clip se nota y se rechaza. Si el autor la
  pide explícitamente, aplica `setpts=PTS/1.2` + `atempo=1.2` (el pitch queda
  intacto) EN EL MISMO pase de ffmpeg que los cortes, y después **re-transcribe**:
  los tiempos viejos ya no valen.
- **Comprueba antes si hace falta.** Si el take no tiene huecos >0.4s, o si el
  transcript da más de ~230 palabras/min sin pausas, alguien ya lo editó:
  pasarle auto-editor no quita nada y añade una generación de compresión.
  Ese caso es **overlay-only** — no cortas nada, solo pones gráficos encima.
- **Retakes**: si el transcript trae la misma frase 2-3 veces seguidas, son
  tomas falladas. Quédate con la ÚLTIMA, corta con `trim/atrim + concat` en un
  solo pase, y re-transcribe.
- Grabaciones de OBS suelen traer **varias pistas de audio idénticas**;
  compruébalo con `volumedetect` y usa `0:a:0`. Y si hay un MP3 al lado con la
  misma duración, ese es el micro limpio: muxéalo.

### 2 · Transcribir — `scripts/transcribir.sh <audio.mp3>`

Tiempos **por palabra**, o no hay karaoke ni sincronía posible.

- Modelo **`medium`**, no `small`. El small no solo se equivoca en palabras: se
  inventa frases enteras con toda la confianza.
- **Siempre** el idioma explícito, o te puede devolver una traducción al inglés
  sin avisar.
- **Revisa las marcas una por una.** Whisper las sustituye por palabras que
  existen: `CloudHot`→Claude Code, `químico`→Kimi Code, `code`→Codex. En un caso
  real cambió una marca por la de la competencia e invirtió el argumento entero.
  Si dudas, extrae esos segundos sueltos y transcríbelos aislados; si sigue sin
  salir, **pregunta**. Nunca adivines una marca en un subtítulo quemado.
- Las correcciones van en `build-captions.py` (`FIXES` y `SPLITS`), no a mano
  sobre el JSON: así se pueden re-generar.

### 3 · Mapear el footage — `scripts/medir.sh <video>`

Antes de diseñar nada. Saca los cortes de plano y una tira de contactos, y de
ahí clasificas cada tramo:

- **a cámara** — la cara es el producto. Los gráficos van por debajo de la
  barbilla; nada la cruza.
- **plano de pantalla** — el footage ES la infografía. No tapes lo que está
  señalando: ni la interfaz que manipula, ni la fuente de un demo, ni una
  captura que el espectador tiene que leer. Los subtítulos van a la franja sin
  contenido.
- **pantalla partida** (captura arriba / cara abajo) — todo vive en la costura.
  El pie de la captura suele ser barra de estado: eso sí se puede tapar.

Mide con la regla de `medir.sh` y anota barbilla, costura y zonas muertas. Esos
números van a `tokens.ts`. **Si no los cambias, el reel le tapará la cara a
alguien.**

### 4 · Privacidad

Si se ve una pantalla, casi seguro se ve algo que no debía publicarse: correos,
nombres de clientes, tarifas, rutas, tokens. Se tapa con **desenfoque, no con
cajas opacas** — el blur mata el texto pero deja ver el movimiento, que muchas
veces ES la demo.

El método completo, con los cuatro errores que cuestan rondas de render, está en
`references/skeleton/src/reel/privacy.tsx`. El resumen: **mide en nativo** (no
sobre miniaturas), la caja tiene que **pasarse 26px** del texto por el degradado
del borde, la cámara a mano **no se sigue interpolando la posición** (ancla y
haz crecer la caja), y los **barridos van a cuadro completo**. Verifica siempre
sobre el archivo final con recortes nativos.

### 5 · Montar

`references/skeleton/` es un proyecto Remotion completo. Copia la carpeta,
`npm install`, y trabaja sobre dos archivos:

- **`src/reel/tokens.ts`** — paleta, escala tipográfica y las medidas de TU
  encuadre. Es el único sitio donde se cambia el look.
- **`src/reel/Reel.tsx`** — el guion: qué tarjeta sale, cuándo y con qué texto.

Las piezas ya están: `Captions` (karaoke palabra a palabra con blur-in),
`panels` (banda y cadena para los tramos a cámara), `seam` (compactas para la
pantalla partida: chips, contraste, trueque, bucle, oferta), `chapters`,
`dm` (hook de mensaje directo) y `motion` (barridos, trazos que se dibujan,
cuentas ascendentes, escalonado por letra).

**Estructura de retención**: hook en los primeros 3s que adelanta el resultado o
enseña la pregunta que el vídeo responde → tarjetas sincronizadas al discurso →
capítulos en las fronteras → remate. Si el autor graba su propio CTA, **no
pongas tarjeta de cierre**: sobra.

**Nada de barra de progreso ni destellos blancos entre secciones.** Lo primero
es genérico y lo segundo es ruido; los capítulos hacen ese trabajo mejor.

### 6 · QA antes de renderizar entero

`npx remotion still Reel qa/f<N>.png --frame=<N>` en el hook, en cada tarjeta y
en el cierre. Comprueba:

- [ ] ninguna tarjeta tapa una cara ni una interfaz que se esté señalando
- [ ] ningún texto se parte mal ni se sale de la caja segura
- [ ] los paneles con reveals escalonados no aparecen vacíos (el contenedor
      arranca ≤0.4s antes del primer elemento)
- [ ] ninguna tarjeta repite la voz de ese segundo

### 7 · Audio — `mix-audio.py`

El script **mide** y calcula; no lleva volúmenes fijos, y ese es el punto:

```
ganancia_cama_dB = (LUFS_voz − 12) − LUFS_cama
```

Poner `volume=0.14` a la música es una lotería sobre el mastering de la pista.
Y `loudnorm` sobre la suma **no lo arregla ni lo delata**: sube la voz para
compensar, el archivo mide −14 LUFS y parece correcto mientras la música se le
come la voz. Los SFX se calibran por **pico** contra el pico de la voz.

Al reportar, di la relación en LU ("la música va 12 LU por debajo de la voz"),
nunca el multiplicador.

### 8 · Export

H.264, 1080×1920, 30fps, **~6 Mbps** (no el máximo: Instagram recomprime a
~3.5 Mbps y cuanto más alto le entregues, más agresiva es esa pasada — un máster
de 30 Mbps se ve PEOR publicado que uno de 6). AAC 256k / 48kHz, −14 LUFS,
`+faststart`. **Nunca H.265**: da errores de subida aunque pese menos.

Y siempre `--color-space=bt709` en el render de Remotion: sin eso saca
`yuvj420p / color_range=pc` y los reproductores que ignoran la etiqueta aplastan
los negros.

## Lo que NO se hace

- **No se corrige el color.** La cámara manda. Un grano y una viñeta sutiles son
  parte del acabado; una corrección de gamma o saturación que nadie pidió es un
  filtro, y se nota.
- **No se acelera el clip** salvo petición explícita.
- **No se tapa la cara.** En un talking-head la cara es el producto.
- **No se inventan datos.**

## Dependencias

`ffmpeg`, `auto-editor` (`pipx install auto-editor`), Node 20+, y `npx
hyperframes transcribe` para la transcripción con tiempos por palabra (o
cualquier Whisper que devuelva word-level timestamps).
