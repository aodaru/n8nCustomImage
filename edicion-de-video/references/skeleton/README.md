# Esqueleto del proyecto

    cp -R skeleton mi-reel && cd mi-reel
    npm install
    mkdir -p public out qa work

Luego:

1. `../scripts/prep.sh <tu-video.mp4> ./work` → deja `work/video.mp4` y `work/audio.mp3`
2. `cp work/video.mp4 public/video.mp4`
3. `../scripts/transcribir.sh work/audio.mp3 ./work`
4. corrige marcas en `build-captions.py` y córrelo → `public/captions.json`
5. `../scripts/medir.sh public/video.mp4` → mide y rellena `src/reel/tokens.ts`
6. escribe el guion en `src/reel/Reel.tsx`
7. `npm run dev` para trabajar, `npm run render` para el máster sin audio
8. `python3 mix-audio.py` → `out/final.mp4`

## Qué toca cada archivo

| archivo | para qué |
|---|---|
| `src/reel/tokens.ts` | **paleta, tipografía y las medidas de tu encuadre** |
| `src/reel/Reel.tsx` | **el guion: qué sale y cuándo** |
| `src/reel/privacy.tsx` | qué se difumina y en qué segundos |
| `build-captions.py` | correcciones del ASR |
| `mix-audio.py` | qué música y qué efectos, en qué beats |
| el resto | piezas; normalmente no se tocan |

## Música y efectos

El esqueleto espera los archivos en `.media/audio/bgm/` y `.media/audio/sfx/`.
Pon los tuyos con esos nombres (`bgm_001.wav`, `sfx_001.mp3`…) o cambia las
rutas al principio de `mix-audio.py`. No hace falta que estén normalizados: el
script los mide y calcula la ganancia.
