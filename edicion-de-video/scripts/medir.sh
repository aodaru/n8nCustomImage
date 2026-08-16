#!/usr/bin/env bash
# Mapa del footage: dónde cambia el plano y qué hay en cada zona del cuadro.
# Sin esto se diseña a ciegas y las tarjetas acaban encima de una cara.
#
#   ./medir.sh <video.mp4> [carpeta-salida]
set -euo pipefail
V="${1:?uso: ./medir.sh <video.mp4> [salida]}"
O="${2:-$(dirname "$V")/mapa}"
mkdir -p "$O"

echo "══ cortes de plano ══"
ffmpeg -hide_banner -v error -i "$V" -vf "select='gt(scene,0.15)',metadata=print:file=-" \
  -an -f null - 2>&1 | grep pts_time | awk -F'pts_time:' '{printf "  %.2fs\n", $2}'

DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$V")
echo
echo "══ tira de contactos cada ~$(python3 -c "print(f'{$DUR/12:.0f}')")s → $O/tira.png ══"
python3 - "$V" "$O" "$DUR" <<'PY'
import subprocess, sys
v, o, dur = sys.argv[1], sys.argv[2], float(sys.argv[3])
ts = [dur * i / 12 for i in range(12)]
for i, t in enumerate(ts):
    subprocess.run(["ffmpeg","-v","error","-ss",f"{t:.2f}","-i",v,"-frames:v","1",
                    "-vf","scale=180:-1","-y",f"{o}/t{i:02d}.png"], check=True)
ins = sum([["-i", f"{o}/t{i:02d}.png"] for i in range(12)], [])
subprocess.run(["ffmpeg","-v","error",*ins,"-filter_complex",
                "".join(f"[{i}]" for i in range(12))+"hstack=12","-y",f"{o}/tira.png"], check=True)
print("  ok")
PY

echo
echo "══ regla vertical (para medir barbilla, costura y zonas muertas) ══"
# Rejilla de 100px sobre un frame a mitad del clip. Cada línea roja = 100px.
G="scale=540:960"
for i in $(seq 1 19); do G="$G,drawbox=y=$((i*50)):w=540:h=1:color=red@0.5:t=fill"; done
for i in $(seq 1 10); do G="$G,drawbox=x=$((i*50)):w=1:h=960:color=cyan@0.5:t=fill"; done
ffmpeg -v error -ss "$(python3 -c "print($DUR/2)")" -i "$V" -frames:v 1 -vf "$G" -y "$O/regla.png"
echo "  $O/regla.png  (cada línea = 100px; multiplica por 2 lo que leas en la imagen)"

cat <<'EOM'

── QUÉ ANOTAR ──
  · barbilla del sujeto en los planos a cámara → PANEL.top
  · si hay pantalla partida: fin de la captura y arriba de la cabeza → SEAM
  · si hay planos de pantalla: qué franja NO tiene nada que leer
  · CUALQUIER cosa privada visible (correos, nombres, tarifas, rutas, tokens)

Y para lo privado, MIDE EN NATIVO, no sobre estas miniaturas:
    ffmpeg -ss <t> -i video.mp4 -frames:v 1 -vf "crop=1080:420:0:380" -y zona.png
Sobre un thumb de 270px te puedes desviar 400 píxeles reales.
EOM
