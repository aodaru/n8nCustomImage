#!/usr/bin/env bash
# Transcripción con tiempos POR PALABRA (sin eso no hay karaoke ni sincronía).
#
#   ./transcribir.sh <audio.mp3> [carpeta] [idioma]
#
# USA EL MODELO `medium`, NO `small`. En audio real el small no solo se
# equivoca en palabras: se inventa frases enteras con toda la confianza.
# Ejemplo medido en un take de 2 minutos —
#   small : "Y alguna vez es que la que tiene un chequeo de calidad"
#   medium: "lo bueno de este es que tiene un chequeo de calidad"
#
# Y SIEMPRE pasa el idioma. Sin `--language`, Whisper puede devolverte una
# traducción al inglés sin avisar de nada.
set -euo pipefail
AUDIO="${1:?uso: ./transcribir.sh <audio.mp3> [carpeta] [idioma]}"
DIR="${2:-$(dirname "$AUDIO")}"
LANG="${3:-es}"

npx hyperframes transcribe "$AUDIO" -d "$DIR" --json --model medium --language "$LANG"

echo
echo "── Palabras por minuto y huecos (para saber si el take ya venía editado) ──"
python3 - "$DIR/transcript.json" <<'PY'
import json, sys
w = json.load(open(sys.argv[1]))
dur = w[-1]["end"] - w[0]["start"]
gaps = [b["start"] - a["end"] for a, b in zip(w, w[1:])]
big = [g for g in gaps if g > 0.5]
print(f"  {len(w)} palabras · {len(w)/dur*60:.0f} palabras/min · {len(big)} huecos >0.5s")
if len(w)/dur*60 > 230 and not big:
    print("  → sin huecos y muy rápido: este take YA ESTABA EDITADO.")
PY

cat <<'EOM'

── AHORA REVISA LAS MARCAS, UNA POR UNA ──
Whisper no reconoce nombres de producto y los sustituye por palabras que
existen, sin bajar la confianza. Casos reales vistos:
    "CloudHot"  → Claude Code
    "químico"   → Kimi Code
    "code"      → Codex
Y en otro vídeo cambió una marca por la de la competencia, lo que INVIRTIÓ
el argumento entero.

Regla: por cada marca que se oiga, comprueba que tiene sentido en la frase.
Si dudas, extrae esos segundos sueltos y transcríbelos aislados:
    ffmpeg -ss <t> -t 6 -i audio.mp3 -y trozo.mp3
Y si sigue sin salir, PREGUNTA. Nunca adivines una marca en un subtítulo
quemado: se publica como si lo hubiera dicho el autor.
EOM
