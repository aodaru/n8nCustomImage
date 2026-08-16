#!/usr/bin/env python3
"""MEZCLA DE AUDIO — voz + cama + SFX, SIN re-renderizar el vídeo.

El render de Remotion ya trae la voz, pero aquí se toma la de `public/video.mp4`
y se copia el vídeo tal cual (`-map 0:v -c:v copy`): así los overlays y las
máscaras quedan intactos y se puede re-mezclar mil veces sin recomprimir imagen.

══════════════════════════════════════════════════════════════════════════════
LA REGLA DEL DUCK — por qué este script MIDE en vez de llevar volúmenes fijos
══════════════════════════════════════════════════════════════════════════════
Poner `volume=0.14` a la música es una lotería sobre el mastering de la pista.
Las camas de catálogo salen entre −10 y −20 LUFS: el mismo 0.14 suena 10 LU más
alto en una que en otra. Y `loudnorm` sobre la suma NO lo arregla ni lo delata —
sube la voz para compensar, el archivo mide −14 LUFS y parece correcto mientras
la música se le come la voz.

Lo correcto es medir las dos y calcular:

    ganancia_cama_dB = (LUFS_voz − DUCK_LU) − LUFS_cama

DUCK_LU = 12 por defecto. 8 si quieres la música más presente; 15-16 en piezas
largas o con camas densas.

Los SFX se calibran por PICO contra el pico de la voz, no por su integrada: en
un golpe corto lo que se percibe es el pico.

    volumen = 10 ** ((pico_voz + objetivo_relativo − pico_sfx) / 20)

Y al reportar el resultado, di la RELACIÓN en LU ("la música va 12 LU por debajo
de la voz"), nunca el multiplicador ni el nivel absoluto de la cama.
"""
import subprocess, pathlib, re, sys

HERE = pathlib.Path(__file__).parent

# ── configura esto ───────────────────────────────────────────────────────────
CUT = 60.0      # segundo en que termina la voz
DUR = 60.5      # duración total del render (frames / fps)
DUCK_LU = 12.0  # cuántos LU por debajo de la voz va la cama

VIDEO = HERE / "out/raw.mp4"        # render sin audio
VOICE = HERE / "public/video.mp4"   # voz limpia, alineada al frame

# Dos temas en vez de uno en bucle: el cambio marca el giro del vídeo. Si solo
# tienes uno, deja BGM_B = BGM_A y SWAP = DUR (nunca cambia).
BGM_A = HERE / ".media/audio/bgm/bgm_001.wav"
BGM_B = HERE / ".media/audio/bgm/bgm_002.wav"
SWAP = 30.0
XF = 2.0

WHOOSH = HERE / ".media/audio/sfx/sfx_001.mp3"
CHIME = HERE / ".media/audio/sfx/sfx_002.mp3"
POP = HERE / ".media/audio/sfx/sfx_003.mp3"
CLICK = HERE / ".media/audio/sfx/sfx_004.mp3"

# (asset, segundo, objetivo en dBFS RELATIVO al pico de la voz)
#   −9  cambio de capítulo / de montaje: el golpe fuerte
#   −13 hook, remate, tarjeta de cierre
#   −18 entra un panel y el cuadro no cambia
#   −21 apuntes, bandas pequeñas
SFX = [
    (CLICK, 0.13, -21),
    (POP, 0.70, -13),
    (WHOOSH, 18.6, -9),
    (WHOOSH, 34.6, -9),
    (CHIME, 50.0, -13),
]
# ─────────────────────────────────────────────────────────────────────────────


def lufs(path: pathlib.Path) -> float:
    out = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(path), "-af", "ebur128", "-f", "null", "-"],
        capture_output=True, text=True,
    ).stderr
    vals = re.findall(r"^\s+I:\s+(-?\d+\.?\d*)\s+LUFS", out, re.M)
    if not vals:
        sys.exit(f"no pude medir la sonoridad de {path}")
    return float(vals[-1])


def peak(path: pathlib.Path) -> float:
    out = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(path), "-af", "volumedetect", "-f", "null", "-"],
        capture_output=True, text=True,
    ).stderr
    m = re.search(r"max_volume:\s+(-?\d+\.?\d*) dB", out)
    if not m:
        sys.exit(f"no pude medir el pico de {path}")
    return float(m.group(1))


def gain(db: float) -> float:
    return round(10 ** (db / 20), 4)


print("── midiendo ──")
V_LUFS, V_PEAK = lufs(VOICE), peak(VOICE)
print(f"  voz     {V_LUFS:6.1f} LUFS · pico {V_PEAK:5.1f} dBFS")

target_bed = V_LUFS - DUCK_LU
bed_vol = {}
for tag, path in (("A", BGM_A), ("B", BGM_B)):
    l = lufs(path)
    bed_vol[tag] = gain(target_bed - l)
    print(f"  cama {tag}  {l:6.1f} LUFS → ×{bed_vol[tag]} (queda {DUCK_LU:.0f} LU bajo la voz)")

sfx_vol = []
for path, at, rel in SFX:
    p = peak(path)
    sfx_vol.append((path, at, gain(V_PEAK + rel - p)))

inputs = [
    "-i", str(VIDEO),
    "-i", str(VOICE),
    "-stream_loop", "-1", "-i", str(BGM_A),
    "-stream_loop", "-1", "-i", str(BGM_B),
]
FMT = "aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo"
B_LEN = DUR - SWAP + XF
parts = [
    # Fundido de 120ms en el corte: cae en silencio, pero sin él el encoder deja
    # un chasquido. `apad` estira la voz en silencio hasta el final para que el
    # amix no alargue la pieza.
    f"[1:a]{FMT},atrim=0:{CUT},afade=t=out:st={CUT - 0.12:.3f}:d=0.12,"
    f"apad=whole_dur={DUR},volume=1.0,asplit=2[voice][vkey]",
    f"[2:a]{FMT},atrim=0:{SWAP + XF},volume={bed_vol['A']},"
    f"afade=t=in:st=0:d=1.5,afade=t=out:st={SWAP:.3f}:d={XF}[bgA]",
    f"[3:a]{FMT},atrim=0:{B_LEN:.3f},volume={bed_vol['B']},"
    f"afade=t=in:st=0:d={XF},afade=t=out:st={B_LEN - 2.6:.3f}:d=2.6,"
    f"adelay={int(SWAP * 1000)}|{int(SWAP * 1000)}[bgB]",
    "[bgA][bgB]amix=inputs=2:normalize=0:duration=longest[bgmraw]",
    # Los −12 LU son la MEDIA. Las camas con rango dinámico alto se le suben a la
    # voz en los crescendos aunque la integrada cuadre: el sidechain recorta solo
    # esos picos y devuelve la cama entera en las pausas.
    "[bgmraw][vkey]sidechaincompress=threshold=0.03:ratio=4:attack=25:release=380"
    ":makeup=1:level_sc=1[bgm]",
]
mix = ["[voice]", "[bgm]"]

for idx, (path, at, vol) in enumerate(sfx_vol, start=4):
    inputs += ["-i", str(path)]
    parts.append(f"[{idx}:a]{FMT},volume={vol},adelay={int(at*1000)}|{int(at*1000)}[s{idx}]")
    mix.append(f"[s{idx}]")

# normalize=0 para que los volúmenes medidos se respeten; loudnorm después
# re-normaliza la SUMA a −14 LUFS, que es el objetivo de IG/TikTok.
parts.append(
    "".join(mix) + f"amix=inputs={len(mix)}:normalize=0:duration=first,"
    f"atrim=0:{DUR},loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[aout]"
)

# EXPORT PARA REELS. Bitrate ~6 Mbps a propósito, NO el máximo: Instagram
# recomprime todo a ~3.5 Mbps y cuanto más alto le entregues, más agresiva es
# esa pasada. Un máster de 30 Mbps se ve PEOR publicado que uno de 6.
# H.264 siempre; H.265 da errores de subida aunque pese menos.
OUT = HERE / "out/final.mp4"
cmd = [
    "ffmpeg", "-y", "-v", "warning", *inputs,
    "-filter_complex", ";".join(parts),
    "-map", "0:v",
    "-c:v", "libx264", "-profile:v", "high", "-level", "4.1", "-preset", "slow",
    "-b:v", "6M", "-maxrate", "6.5M", "-bufsize", "12M",
    "-pix_fmt", "yuv420p", "-g", "60", "-color_range", "tv",
    "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
    "-map", "[aout]", "-c:a", "aac", "-b:a", "256k", "-ar", "48000",
    "-movflags", "+faststart", str(OUT),
]
print(f"\n── mezclando {len(mix)} pistas → {OUT.name} ──")
subprocess.run(cmd, check=True)
print(f"listo · la música va {DUCK_LU:.0f} LU por debajo de la voz")
