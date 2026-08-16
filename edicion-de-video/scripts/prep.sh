#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# PREPARACIÓN DEL MATERIAL
#
#   ./prep.sh <video-de-camara.mp4> [carpeta-de-trabajo]
#
# Hace, en orden:
#   1. Ficha del archivo (resolución, fps, pistas de audio)
#   2. Decide si HAY QUE CORTAR SILENCIOS o el take ya viene editado
#   3. Corta los silencios con auto-editor
#   4. Reencodea a 30fps con keyframes densos y color bien etiquetado
#   5. Saca el audio para transcribir
#
# Requisitos: ffmpeg, auto-editor (pipx install auto-editor)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SRC="${1:?uso: ./prep.sh <video.mp4> [carpeta]}"
W="${2:-$(dirname "$SRC")/work}"
mkdir -p "$W"

echo "══ 1 · ficha ══"
ffprobe -v error -show_entries format=duration,size,bit_rate \
  -show_entries stream=index,codec_type,codec_name,width,height,r_frame_rate,channels \
  -of default=noprint_wrappers=1 "$SRC"

# ── Grabaciones de OBS suelen traer VARIAS pistas de audio idénticas.
#    Si lo son, sobra con la primera. Se comprueba, no se asume.
NTRACKS=$(ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$SRC" | wc -l | tr -d ' ')
echo
echo "══ 2 · pistas de audio: $NTRACKS ══"
if [ "$NTRACKS" -gt 1 ]; then
  for i in $(seq 0 $((NTRACKS - 1))); do
    printf "  pista %s: " "$i"
    ffmpeg -hide_banner -i "$SRC" -map "0:a:$i" -af volumedetect -f null - 2>&1 |
      grep mean_volume | awk '{print $5, $6}'
  done
  echo "  (si son iguales, usa 0:a:0)"
fi

# Si hay un MP3 al lado con la MISMA duración ±0.1s, es el audio limpio del
# micro: ese manda sobre el de la cámara.
BASE="${SRC%.*}"
for ext in MP3 mp3 WAV wav; do
  if [ -f "$BASE.$ext" ]; then
    D1=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SRC")
    D2=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$BASE.$ext")
    if python3 -c "import sys; sys.exit(0 if abs($D1-$D2)<0.15 else 1)"; then
      echo "  ⚠ hay un $ext con la misma duración: es el audio limpio, muxéalo"
      echo "    ffmpeg -i \"$SRC\" -i \"$BASE.$ext\" -map 0:v -map 1:a -c:v copy -shortest ..."
    fi
  fi
done

echo
echo "══ 3 · ¿hace falta cortar silencios? ══"
ffmpeg -hide_banner -v error -i "$SRC" -map 0:a:0 -ac 1 -ar 16000 \
  -c:a libmp3lame -q:a 2 -y "$W/probe.mp3"
GAPS=$(ffmpeg -hide_banner -i "$W/probe.mp3" -af silencedetect=n=-30dB:d=0.4 -f null - 2>&1 |
  grep -c silence_start || true)
echo "  huecos >0.4s a -30dB: $GAPS"

if [ "$GAPS" -lt 3 ]; then
  cat <<'EOM'
  → EL TAKE YA VIENE EDITADO. No pases auto-editor: no quitaría nada y
    además te añade una generación de compresión. Comprueba también las
    palabras por minuto del transcript: por encima de ~230 y sin huecos
    >0.5s, alguien ya cortó esto.
    Salta al paso 4 con el archivo original.
EOM
  CLEAN="$SRC"
else
  echo "  → cortando con auto-editor (margen 0.2s)"
  # margen 0.2s es el probado: no come los ataques de palabra. Si se pide
  # "lo más fluido posible", 0.1s también aguanta.
  # SIN --video-speed: acelerar el clip se nota y se rechaza.
  auto-editor "$SRC" --margin 0.2sec --no-open -o "$W/clean.mp4"
  CLEAN="$W/clean.mp4"
  echo "  duración: $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SRC") →" \
    "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$CLEAN")"
fi

echo
echo "══ 4 · máster a 30fps para el renderer ══"
# -g 30 = keyframe por segundo: el renderer busca por frame y sin keyframes
# densos el seek se va de sitio.
# El color se etiqueta explícitamente; si la fuente ya es bt709 esto solo lo
# conserva, y evita que el reproductor tenga que adivinar.
ffmpeg -hide_banner -v error -i "$CLEAN" -map 0:v:0 -map 0:a:0 -vf "fps=30" \
  -c:v libx264 -crf 18 -preset slow -g 30 -keyint_min 30 -pix_fmt yuv420p \
  -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -c:a aac -b:a 256k -ar 48000 -ac 2 -movflags +faststart -y "$W/video.mp4"

echo
echo "══ 5 · audio para transcribir ══"
ffmpeg -hide_banner -v error -i "$W/video.mp4" -map 0:a:0 -ac 1 -ar 16000 \
  -c:a libmp3lame -q:a 2 -y "$W/audio.mp3"
rm -f "$W/probe.mp3"

echo
echo "listo:"
echo "  $W/video.mp4   → cópialo a tu-proyecto/public/video.mp4"
echo "  $W/audio.mp3   → transcríbelo (ver scripts/transcribir.sh)"
