#!/usr/bin/env python3
"""Whisper word-level JSON → public/captions.json (formato @remotion/captions).

Aquí es donde se arreglan los errores del ASR ANTES de que se quemen en el
vídeo. Dos tipos:

  FIXES  — una palabra por otra, misma duración
  SPLITS — un token que en realidad son dos palabras (pasa siempre con las
           marcas: "CloudHot" era "Claude Code", "químico" era "Kimi Code").
           Se reparte la duración del token entre las dos.

Los tiempos de Whisper NO se tocan: son los que sincronizan el karaoke.
"""
import json, pathlib

HERE = pathlib.Path(__file__).parent
SRC = HERE / "work/transcript.json"   # ← salida de scripts/transcribir.sh

# segundo_de_inicio -> texto corregido
FIXES: dict[float, str] = {
    # 95.76: "experto",
}
# segundo_de_inicio -> las dos palabras en que se parte el token
SPLITS: dict[float, tuple[str, str]] = {
    # 50.64: ("Claude", "Code"),
}

words = json.load(SRC.open())
ms = lambda x: int(round(x * 1000))


def cap(text, start, end, prob=1.0):
    return {
        "text": text,
        "startMs": ms(start),
        "endMs": ms(end),
        "timestampMs": ms((start + end) / 2),
        "confidence": round(prob, 3),
    }


caps = []
for w in words:
    text, start, end = w["text"].strip(), w["start"], w["end"]
    prob = w.get("probability", 1.0)
    hit = next((k for k in SPLITS if abs(start - k) < 0.02), None)
    if hit:
        a, b = SPLITS[hit]
        mid = (start + end) / 2
        caps += [cap(a, start, mid, prob), cap(b, mid, end, prob)]
        continue
    for at, fixed in FIXES.items():
        if abs(start - at) < 0.02:
            tail = "".join(c for c in text[-1:] if c in ",.:;?!")
            text = fixed + tail
    caps.append(cap(text, start, end, prob))

out = HERE / "public/captions.json"
out.parent.mkdir(exist_ok=True)
out.write_text(json.dumps(caps, ensure_ascii=False, indent=1))
print(f"{len(caps)} palabras -> {out}")
print("último ms:", caps[-1]["endMs"])
