# Herramientas de edición de video para n8n en TrueNAS

Herramientas independientes para que el n8n existente orqueste un pipeline
editorial de edición de video. Este repositorio despliega únicamente Remotion y
Whisper API; n8n, PostgreSQL y Redis/Valkey ya existen fuera del proyecto.

## Alcance vigente

- Usuario objetivo: editor individual que trabaja principalmente en español.
- Flujo: transcripción, captions, composición visual, revisión humana y QA.
- Despliegue: manual desde la GUI de TrueNAS.
- Integración: red externa `ix-internal-n8n-n8n-net` y volumen compartido.
- Prioridad actual: integrar Whisper y Remotion. FFmpeg se ejecutará por SSH en
  un contenedor externo de scripts que comparte el volumen de videos con n8n.

## Contexto

| Componente | Detalle |
|---|---|
| TrueNAS | 25.04.2.6 (Fangtooth), kernel 6.12.15 |
| GPU | NVIDIA GeForce GT 740 (GK107), driver 470.256.02, CUDA 11.4 |
| Docker GPU | nvidia-container-toolkit v1.19.1 (no funcional con GT 740 en contenedores) |
| n8n | v2.35.0, imagen custom `n8n-gpu:latest` (FROM node:24-bookworm-slim) |
| Puerto n8n | 30109 |
| Ruta datos | `/mnt/Aodnas/Docker/N8N/data` |
| Modo GPU | CPU (GT 740 incompatible con CUDA en contenedores) |

## Arquitectura

```
┌──────────────────────────────────────────────────────────┐
│              TrueNAS Docker Compose "n8n-aod"             │
│                                                            │
│  ┌──────────┐   POST /api/render  ┌──────────────┐       │
│  │   n8n    │ ──────────────────→ │  Remotion     │       │
│  │          │                      │  (Express)    │       │
│  │ ffmpeg   │   POST /            │  Node.js 20   │       │
│  │ python   │ ←───────────────── │  Chromium     │       │
│  │ auto-ed  │   { transcription } │  Remotion 4   │       │
│  └────┬─────┘                     └───────┬───────┘       │
│       │                                   │               │
│       │         ┌───────────────┐         │               │
│       └────────→│  whisper-api  │─────────┘               │
│                 │  faster-whisper │                        │
│                 │  CPU (medium)   │                        │
│                 └───────┬───────┘                         │
│                         │                                 │
│  ┌──────────────────────┴────────────────────────────┐   │
│  │         /workspace/videos (volumen compartido)    │   │
│  └───────────────────────────────────────────────────┘   │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

**2 contenedores gestionados manualmente desde la GUI de TrueNAS:**
- **whisper-api** — faster-whisper, CPU, medium model, FastAPI API (transcripción)
- **Remotion** — Node.js 20, Chromium, Express API (renderizado de overlays)

El contenedor n8n ya existe y no se crea en este proyecto. Los servicios de este
Compose se instalan manualmente desde la GUI de TrueNAS y se conectan a la red
externa `ix-internal-n8n-n8n-net` para que n8n los consuma por sus nombres internos.
PostgreSQL y Redis/Valkey pertenecen al despliegue existente de n8n y quedan
fuera de este proyecto.

**Comunicación n8n → whisper-api:** HTTP API interna (n8n llama a `http://whisper-api:9000/`)
**Comunicación n8n → Remotion:** HTTP API interna (n8n llama a `http://remotion:3000/api/render`)

---

## Pipeline de edición de video (8 pasos)

| Paso | Qué hace | Herramienta | Contenedor |
|------|----------|-------------|------------|
| 1. Preparar | Ficha del archivo, corte de silencios, máster a 30fps | auto-editor + ffmpeg | n8n |
| 2. Transcribir | Tiempos por palabra para karaoke | faster-whisper (medium) | whisper-api |
| 3. Medir | Cortes de plano, línea de la barbilla | ffmpeg + ffprobe | n8n |
| 4. Privacidad | Tapar correos, tokens, rutas | ffmpeg blur | n8n |
| 5. Montar | Subtítulos, tarjetas, capítulos | Remotion | remotion |
| 6. QA | Frames sueltos antes del render completo | Remotion still | remotion |
| 7. Audio | Música y efectos calibrados contra la voz | ffmpeg + Python | n8n |
| 8. Export | Archivo final listo para publicar | ffmpeg | n8n |

**Regla de oro:** Ninguna tarjeta repite lo que se está oyendo. Cada tarjeta aporta contraste, consecuencia o un dato derivado.

---

## Fase 1: Preparar entorno de build

### Crear datasets en TrueNAS

```bash
ssh -i ~/.ssh/id_ed25519_github truenas_admin@10.0.5.16
```

```bash
# Crear dataset para videos
mkdir -p /mnt/Aodnas/Docker/videos/{input,output}

# Crear directorios de build
mkdir -p /mnt/Aodnas/Docker/N8N/build/scripts
mkdir -p /mnt/Aodnas/Docker/remotion-server/server
mkdir -p /mnt/Aodnas/Docker/remotion-project/src/reel
mkdir -p /mnt/Aodnas/Docker/whisper-cpu
```

### Estructura de archivos

```
/mnt/Aodnas/Docker/
├── N8N/
│   ├── build/
│   │   ├── Dockerfile
│   │   └── scripts/
│   │       ├── prep.sh
│   │       ├── transcribir.sh
│   │       ├── medir.sh
│   │       └── mix-audio.py
│   └── data/                    ← datos n8n (uid 568)
├── remotion-server/
│   ├── Dockerfile
│   ├── package-server.json
│   └── server/
│       ├── index.js
│       └── render.js
├── remotion-project/
│   ├── package.json
│   ├── tsconfig.json
│   ├── remotion.config.ts
│   └── src/
│       ├── index.ts
│       ├── Root.tsx
│       └── reel/
│           ├── tokens.ts
│           ├── Reel.tsx
│           ├── Captions.tsx
│           ├── panels.tsx
│           ├── seam.tsx
│           ├── privacy.tsx
│           ├── chapters.tsx
│           └── motion.tsx
├── whisper-cpu/
│   ├── Dockerfile
│   └── server.py
├── docker-compose-n8n-gpu.yaml
└── videos/
    ├── input/
    └── output/
```

---

## Fase 2: Construir imagen n8n (ffmpeg + Python + n8n@2.35.0)

### Problema resuelto

La imagen oficial `ghcr.io/n8n-io/n8n` es Docker Hardened (Alpine sin gestor de paquetes). No se pueden instalar ffmpeg, python ni auto-editor. Solución: construir desde `node:24-bookworm-slim`.

### Dockerfile

```dockerfile
FROM node:24-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g n8n@2.35.0

RUN pip3 install --break-system-packages auto-editor

COPY scripts/ /opt/scripts/
RUN chmod +x /opt/scripts/*.sh

RUN mkdir -p /workspace/videos /home/node/.n8n \
    && chown -R node:node /workspace /home/node/.n8n

USER node

ENV N8N_PORT=5678
ENV N8N_USER_FOLDER=/home/node/.n8n

EXPOSE 5678

CMD ["n8n", "start"]
```

**Notas importantes:**
- `node:24-bookworm-slim` porque n8n@2.35.0 requiere Node >= 22
- `build-essential` es necesario para compilar `isolated-vm` (dependencia nativa de n8n)
- Sin GPU — todo funciona en CPU

### Build

```bash
docker build --pull -t n8n-gpu:latest /mnt/Aodnas/Docker/N8N/build/
```

---

## Fase 3: Construir imagen Remotion (Node.js + Chromium + Express)

### Dockerfile

```dockerfile
FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libdbus-1-3 libatk1.0-0 libgbm-dev libasound2 \
    libxrandr2 libxkbcommon-dev libxfixes3 libxcomposite1 \
    libxdamage1 libatk-bridge2.0-0 libcups2 libpango-1.0-0 libcairo2 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY server/ ./server/
COPY package-server.json ./package.json
RUN npm install --production

COPY project/ ./project/
WORKDIR /app/project
RUN npm install
RUN npx remotion browser ensure

ENV NODE_ENV=production
ENV WORKSPACE_PATH=/workspace/videos
ENV REMOTION_PROJECT_PATH=/app/project
ENV SERVER_PORT=3000
ENV MAX_CONCURRENT_RENDERS=1
ENV RENDER_CONCURRENCY=2

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

WORKDIR /app
CMD ["node", "server/index.js"]
```

### Build

```bash
docker build -t n8n-remotion:latest /mnt/Aodnas/Docker/remotion-server/
```

---

## Fase 4: Construir imagen Whisper CPU (faster-whisper)

### Problema resuelto

La imagen `yoeven/insanely-fast-whisper-api:latest` (34.7GB) requiere CUDA 12.3+ (driver 545+). La GT 740 solo soporta driver 470.x (CUDA 11.4). CUDA 12+ eliminó soporte para Kepler.

Solución: API ligera con `faster-whisper` en CPU usando el modelo `medium`.

### Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    faster-whisper \
    fastapi \
    uvicorn \
    python-multipart \
    requests

COPY server.py /app/server.py

EXPOSE 9000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "9000"]
```

### server.py

```python
import os
import tempfile
import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional

app = FastAPI()

MODEL_SIZE = os.getenv("WHISPER_MODEL", "medium")
model = None

def get_model():
    global model
    if model is None:
        from faster_whisper import WhisperModel
        model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")
    return model

class TranscribeRequest(BaseModel):
    url: Optional[str] = None
    audio_path: Optional[str] = None
    language: Optional[str] = None
    task: str = "transcribe"

@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_SIZE, "device": "cpu"}

@app.post("/")
def transcribe(req: TranscribeRequest):
    if not req.url and not req.audio_path:
        raise HTTPException(400, "Provide url or audio_path")

    with tempfile.NamedTemporaryFile(suffix=".audio", delete=False) as f:
        tmp_path = f.name
        if req.url:
            r = requests.get(req.url, timeout=300)
            r.raise_for_status()
            f.write(r.content)
        elif req.audio_path:
            import shutil
            shutil.copy2(req.audio_path, tmp_path)

    try:
        m = get_model()
        segments, info = m.transcribe(
            tmp_path,
            language=req.language,
            task=req.task,
            word_timestamps=True,
        )

        words = []
        text_parts = []
        for seg in segments:
            text_parts.append(seg.text.strip())
            if seg.words:
                for w in seg.words:
                    words.append({
                        "word": w.word.strip(),
                        "start": round(w.start, 3),
                        "end": round(w.end, 3),
                        "probability": round(w.probability, 3),
                    })

        return {
            "text": " ".join(text_parts),
            "language": info.language,
            "language_probability": round(info.language_probability, 3),
            "duration": round(info.duration, 3),
            "words": words,
        }
    finally:
        os.unlink(tmp_path)
```

### Build

```bash
docker build -t whisper-cpu:latest /mnt/Aodnas/Docker/whisper-cpu/
```

### API de Whisper

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/health` | GET | Health check (modelo, dispositivo) |
| `/` | POST | Transcribir audio |

### Ejemplo de request POST

```json
{
  "url": "/workspace/videos/input/audio.mp3",
  "task": "transcribe",
  "language": "es"
}
```

**Response:**
```json
{
  "text": "Hola mundo esto es una transcripción",
  "language": "es",
  "language_probability": 0.98,
  "duration": 120.5,
  "words": [
    { "word": "Hola", "start": 0.0, "end": 0.3, "probability": 0.99 },
    { "word": "mundo", "start": 0.3, "end": 0.7, "probability": 0.97 }
  ]
}
```

---

## Fase 5: docker-compose.yaml

El archivo `docker-compose.yaml` de este repositorio despliega únicamente
`remotion` y `whisper-api`. El n8n existente, PostgreSQL y Redis/Valkey se
administran fuera de este Compose.

Antes de instalarlo desde TrueNAS, copiar `.env.example` a `.env`. El servicio no publica
puertos al host: n8n consume internamente `whisper-api:9000` y
`remotion:3000`.

### Decisiones clave del compose

- **Puerto `30109:5678`** — mantiene compatibilidad con nginx-proxy-manager
- **`N8N_FORMDATA_FILE_SIZE_MAX=2000`** — permite uploads de video hasta 2GB via webhook
- **Sin `runtime: nvidia`** — GT 740 no funciona con CUDA en contenedores
- **whisper-cpu en CPU** — modelo medium con faster-whisper, suficiente para transcripción batch
- **`whisper-api` sin puertos al host** — solo accesible internamente por n8n via `http://whisper-api:9000`
- **`remotion` sin puertos al host** — solo accesible internamente por n8n
- **`remotion-project` montado `:ro`** — n8n no puede modificar el código fuente
- **`videos` compartido** — todos los contenedores leen/escriben en el mismo volumen
- **`start_period: 60s` en whisper** — primera ejecución descarga modelo (~3GB), necesita tiempo

---

## Fase 6: Verificar

### Contenedores arriba

```bash
docker ps --format "table {{.Names}}\t{{.Status}}" | grep n8n-aod
```

### n8n funcional

```bash
curl -s http://localhost:30109/healthz
# → {"status":"ok"}
```

### Whisper API (desde n8n)

```bash
docker exec ix-n8n-aod-n8n-1 curl -s http://whisper-api:9000/health
# → {"status":"ok","model":"medium","device":"cpu"}
```

### Remotion API (desde n8n)

```bash
docker exec ix-n8n-aod-n8n-1 curl -s http://remotion:3000/health
```

### ffmpeg (CPU)

```bash
docker exec ix-n8n-aod-n8n-1 ffmpeg -encoders 2>/dev/null | grep libx264
# → V....D libx264              libx264 H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10
```

---

## Fase 7: Workflow en n8n (pipeline completo de 8 pasos)

### Flujo del pipeline

```
[Webhook] → [prep.sh] → [whisper API] → [build-captions.py] → [medir.sh]
                                                                    ↓
                                                    [PAUSA: revisar tira.png/regla.png]
                                                                    ↓
                                                    [Remotion render + polling]
                                                                    ↓
                                                    [PAUSA: revisar QA frames]
                                                                    ↓
                                                    [mix-audio.py] → [Response]
```

### Workflow JSON para n8n (17 nodos)

Importar este workflow en n8n via clipboard (n8n UI → Import from clipboard):

```json
{
  "name": "Video Editing Pipeline",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "video-pipeline",
        "responseMode": "responseNode",
        "options": {}
      },
      "id": "webhook-trigger",
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [0, 0],
      "webhookId": "video-pipeline"
    },
    {
      "parameters": {
        "jsCode": "const body = $input.first().json.body || $input.first().json;\nconst videoName = body['video-name'] || body.videoName || 'video';\nconst language = body.language || 'es';\nconst jobId = `job_${Date.now()}_${videoName}`;\nconst workDir = `/workspace/videos/work/${videoName}`;\n\nconst state = {\n  jobId,\n  videoName,\n  language,\n  fixes: body.fixes || {},\n  splits: body.splits || {},\n  workDir,\n  inputPath: `/workspace/videos/input/${videoName}.mp4`,\n  videoPath: `${workDir}/video.mp4`,\n  audioPath: `${workDir}/audio.mp3`,\n  transcriptPath: `${workDir}/transcript.json`,\n  captionsPath: `${workDir}/captions.json`,\n  mapaDir: `${workDir}/mapa`,\n  status: 'initialized'\n};\n\nconst staticData = $getWorkflowStaticData('global');\nstaticData[jobId] = state;\n\nreturn [{ json: state }];"
      },
      "id": "init-job",
      "name": "Initialize Job",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [220, 0]
    },
    {
      "parameters": {
        "command": "=bash /opt/scripts/prep.sh {{ $json.inputPath }} {{ $json.workDir }}"
      },
      "id": "prep-video",
      "name": "Prep Video",
      "type": "n8n-nodes-base.executeCommand",
      "typeVersion": 1,
      "position": [440, 0]
    },
    {
      "parameters": {
        "jsCode": "const exitCode = $input.first().json.exitCode;\nif (exitCode !== 0) {\n  throw new Error(`prep.sh failed: ${$input.first().json.stderr}`);\n}\nconst state = $('Initialize Job').first().json;\nconst staticData = $getWorkflowStaticData('global');\nstaticData[state.jobId].status = 'prep_done';\nreturn [{ json: state }];"
      },
      "id": "check-prep",
      "name": "Check Prep",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [660, 0]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "http://whisper-api:9000/",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ url: $json.audioPath, task: 'transcribe', language: $json.language }) }}",
        "options": {
          "timeout": 600000
        }
      },
      "id": "whisper-api",
      "name": "Whisper API",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [880, 0]
    },
    {
      "parameters": {
        "jsCode": "const fs = require('fs');\nconst whisperResult = $input.first().json;\nconst state = $('Initialize Job').first().json;\n\nconst words = (whisperResult.words || []).map(w => ({\n  text: (w.word || w.text || '').trim(),\n  start: w.start,\n  end: w.end,\n  probability: w.probability || 1.0\n}));\n\nfs.writeFileSync(state.transcriptPath, JSON.stringify(words, null, 2));\n\nconst staticData = $getWorkflowStaticData('global');\nstaticData[state.jobId].status = 'whisper_done';\nstaticData[state.jobId].whisperResult = {\n  wordCount: words.length,\n  duration: words.length > 0 ? words[words.length - 1].end : 0\n};\n\nreturn [{ json: { ...state, words } }];"
      },
      "id": "save-transcript",
      "name": "Save Transcript",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1100, 0]
    },
    {
      "parameters": {
        "jsCode": "const fs = require('fs');\nconst path = require('path');\nconst state = $('Initialize Job').first().json;\nconst words = $input.first().json.words;\n\nconst corrections = {\n  fixes: state.fixes || {},\n  splits: state.splits || {}\n};\n\nconst captions = words.map(w => {\n  let text = w.text;\n  const startSec = w.start.toFixed(2);\n\n  if (corrections.splits[startSec]) {\n    const parts = corrections.splits[startSec];\n    const dur = w.end - w.start;\n    const mid = w.start + dur / 2;\n    return [\n      { text: parts[0], startMs: Math.round(w.start * 1000), endMs: Math.round(mid * 1000), timestampMs: Math.round(w.start * 1000), confidence: w.probability },\n      { text: parts[1], startMs: Math.round(mid * 1000), endMs: Math.round(w.end * 1000), timestampMs: Math.round(mid * 1000), confidence: w.probability }\n    ];\n  }\n\n  if (corrections.fixes[startSec]) {\n    text = corrections.fixes[startSec];\n  }\n\n  return [{\n    text,\n    startMs: Math.round(w.start * 1000),\n    endMs: Math.round(w.end * 1000),\n    timestampMs: Math.round(w.start * 1000),\n    confidence: w.probability\n  }];\n}).flat();\n\nfs.mkdirSync(path.dirname(state.captionsPath), { recursive: true });\nfs.writeFileSync(state.captionsPath, JSON.stringify(captions, null, 2));\n\nconst staticData = $getWorkflowStaticData('global');\nstaticData[state.jobId].status = 'captions_done';\n\nreturn [{ json: { ...state, captions } }];"
      },
      "id": "build-captions",
      "name": "Build Captions",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1320, 0]
    },
    {
      "parameters": {
        "command": "=bash /opt/scripts/medir.sh {{ $json.videoPath }} {{ $json.mapaDir }}"
      },
      "id": "medir",
      "name": "Medir",
      "type": "n8n-nodes-base.executeCommand",
      "typeVersion": 1,
      "position": [1540, 0]
    },
    {
      "parameters": {
        "jsCode": "const exitCode = $input.first().json.exitCode;\nif (exitCode !== 0) {\n  throw new Error(`medir.sh failed: ${$input.first().json.stderr}`);\n}\nconst state = $('Initialize Job').first().json;\nconst staticData = $getWorkflowStaticData('global');\nstaticData[state.jobId].status = 'medir_done';\n\nreturn [{ json: state }];"
      },
      "id": "check-medir",
      "name": "Check Medir",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1760, 0]
    },
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "video-resume",
        "responseMode": "responseNode",
        "options": {}
      },
      "id": "human-review-pause",
      "name": "Human Review Pause",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [1980, 0],
      "webhookId": "video-resume"
    },
    {
      "parameters": {
        "jsCode": "const body = $input.first().json.body || $input.first().json;\nconst jobId = body.jobId;\nconst staticData = $getWorkflowStaticData('global');\nconst state = staticData[jobId];\n\nif (!state) throw new Error(`Job ${jobId} not found`);\n\nstate.humanModifications = {\n  tokens: body.tokens || {},\n  privacy: body.privacy || {}\n};\nstate.status = 'human_review_done';\nstaticData[jobId] = state;\n\nreturn [{ json: state }];"
      },
      "id": "apply-modifications",
      "name": "Apply Modifications",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [2200, 0]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "http://remotion:3000/api/render",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ compositionId: 'Reel', inputProps: { captions: $json.captions, duration: $json.captions[$json.captions.length - 1].endMs / 1000 } }) }}",
        "options": {
          "timeout": 300000
        }
      },
      "id": "remotion-render",
      "name": "Remotion Render",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [2420, 0]
    },
    {
      "parameters": {
        "jsCode": "const renderResult = $input.first().json;\nconst jobId = renderResult.jobId;\nconst state = $('Initialize Job').first().json;\n\nconst staticData = $getWorkflowStaticData('global');\nstaticData[state.jobId].renderJobId = jobId;\nstaticData[state.jobId].status = 'rendering';\n\nreturn [{ json: { ...state, renderJobId: jobId, pollCount: 0 } }];"
      },
      "id": "store-render-id",
      "name": "Store Render ID",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [2640, 0]
    },
    {
      "parameters": {
        "method": "GET",
        "url": "=http://remotion:3000/api/render/{{ $json.renderJobId }}",
        "options": {},
        "onError": "continueRegularOutput"
      },
      "id": "poll-render",
      "name": "Poll Render",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [2860, 0]
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict"
          },
          "conditions": [
            {
              "id": "cond-completed",
              "leftValue": "={{ $json.status }}",
              "rightValue": "completed",
              "operator": {
                "type": "string",
                "operation": "equals"
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "id": "render-done",
      "name": "Render Done?",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2,
      "position": [3080, 0]
    },
    {
      "parameters": {
        "jsCode": "const state = $('Initialize Job').first().json;\nconst staticData = $getWorkflowStaticData('global');\nstaticData[state.jobId].status = 'render_done';\nreturn [{ json: state }];"
      },
      "id": "render-success",
      "name": "Render Success",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [3300, 0]
    },
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "video-qa-resume",
        "responseMode": "responseNode",
        "options": {}
      },
      "id": "qa-pause",
      "name": "QA Pause",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [3520, 0],
      "webhookId": "video-qa-resume"
    },
    {
      "parameters": {
        "jsCode": "const body = $input.first().json.body || $input.first().json;\nif (!body.approved) {\n  throw new Error(`QA not approved: ${body.notes || 'No notes'}`);\n}\nconst jobId = body.jobId;\nconst staticData = $getWorkflowStaticData('global');\nconst state = staticData[jobId];\nstate.status = 'qa_approved';\nstaticData[jobId] = state;\nreturn [{ json: state }];"
      },
      "id": "check-qa",
      "name": "Check QA",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [3740, 0]
    },
    {
      "parameters": {
        "command": "=python3 /app/project/mix-audio.py {{ $json.workDir }}"
      },
      "id": "mix-audio",
      "name": "Mix Audio",
      "type": "n8n-nodes-base.executeCommand",
      "typeVersion": 1,
      "position": [3960, 0]
    },
    {
      "parameters": {
        "jsCode": "const exitCode = $input.first().json.exitCode;\nif (exitCode !== 0) {\n  throw new Error(`mix-audio.py failed: ${$input.first().json.stderr}`);\n}\nconst state = $('Initialize Job').first().json;\nconst staticData = $getWorkflowStaticData('global');\nstaticData[state.jobId].status = 'completed';\n\nreturn [{ json: {\n  success: true,\n  jobId: state.jobId,\n  videoName: state.videoName,\n  finalOutput: `${state.workDir}/out/final.mp4`\n}}];"
      },
      "id": "final-output",
      "name": "Final Output",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [4180, 0]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ JSON.stringify($json) }}",
        "options": {}
      },
      "id": "respond-success",
      "name": "Respond Success",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.1,
      "position": [4400, 0]
    },
    {
      "parameters": {
        "jsCode": "const state = $('Initialize Job').first().json;\nreturn [{ json: { ...state, jobId: state.jobId } }];"
      },
      "id": "wait-retry",
      "name": "Wait Retry",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [3300, 200]
    },
    {
      "parameters": {
        "amount": 5,
        "unit": "seconds"
      },
      "id": "wait-5s",
      "name": "Wait 5s",
      "type": "n8n-nodes-base.wait",
      "typeVersion": 1.1,
      "position": [3520, 200]
    },
    {
      "parameters": {
        "jsCode": "const state = $('Initialize Job').first().json;\nconst pollCount = ($input.first().json.pollCount || 0) + 1;\nif (pollCount >= 120) {\n  throw new Error('Render timeout after 10 minutes');\n}\nreturn [{ json: { ...state, renderJobId: state.renderJobId || $('Store Render ID').first().json.renderJobId, pollCount } }];"
      },
      "id": "increment-poll",
      "name": "Increment Poll",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [3740, 200]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [[{ "node": "Initialize Job", "type": "main", "index": 0 }]]
    },
    "Initialize Job": {
      "main": [[{ "node": "Prep Video", "type": "main", "index": 0 }]]
    },
    "Prep Video": {
      "main": [[{ "node": "Check Prep", "type": "main", "index": 0 }]]
    },
    "Check Prep": {
      "main": [[{ "node": "Whisper API", "type": "main", "index": 0 }]]
    },
    "Whisper API": {
      "main": [[{ "node": "Save Transcript", "type": "main", "index": 0 }]]
    },
    "Save Transcript": {
      "main": [[{ "node": "Build Captions", "type": "main", "index": 0 }]]
    },
    "Build Captions": {
      "main": [[{ "node": "Medir", "type": "main", "index": 0 }]]
    },
    "Medir": {
      "main": [[{ "node": "Check Medir", "type": "main", "index": 0 }]]
    },
    "Check Medir": {
      "main": [[{ "node": "Human Review Pause", "type": "main", "index": 0 }]]
    },
    "Human Review Pause": {
      "main": [[{ "node": "Apply Modifications", "type": "main", "index": 0 }]]
    },
    "Apply Modifications": {
      "main": [[{ "node": "Remotion Render", "type": "main", "index": 0 }]]
    },
    "Remotion Render": {
      "main": [[{ "node": "Store Render ID", "type": "main", "index": 0 }]]
    },
    "Store Render ID": {
      "main": [[{ "node": "Poll Render", "type": "main", "index": 0 }]]
    },
    "Poll Render": {
      "main": [[{ "node": "Render Done?", "type": "main", "index": 0 }]]
    },
    "Render Done?": {
      "main": [
        [{ "node": "Render Success", "type": "main", "index": 0 }],
        [{ "node": "Wait Retry", "type": "main", "index": 0 }]
      ]
    },
    "Render Success": {
      "main": [[{ "node": "QA Pause", "type": "main", "index": 0 }]]
    },
    "QA Pause": {
      "main": [[{ "node": "Check QA", "type": "main", "index": 0 }]]
    },
    "Check QA": {
      "main": [[{ "node": "Mix Audio", "type": "main", "index": 0 }]]
    },
    "Mix Audio": {
      "main": [[{ "node": "Final Output", "type": "main", "index": 0 }]]
    },
    "Final Output": {
      "main": [[{ "node": "Respond Success", "type": "main", "index": 0 }]]
    },
    "Wait Retry": {
      "main": [[{ "node": "Wait 5s", "type": "main", "index": 0 }]]
    },
    "Wait 5s": {
      "main": [[{ "node": "Increment Poll", "type": "main", "index": 0 }]]
    },
    "Increment Poll": {
      "main": [[{ "node": "Poll Render", "type": "main", "index": 0 }]]
    }
  },
  "pinData": {},
  "settings": {
    "executionOrder": "v1"
  },
  "staticData": null,
  "tags": [],
  "triggerCount": 0
}
```

### Nodos del workflow

| # | Nodo | Tipo | Qué hace |
|---|------|------|----------|
| 1 | **Webhook** | webhook | Recibe POST `/webhook/video-pipeline` |
| 2 | **Initialize Job** | code | Crea jobId, inicializa paths |
| 3 | **Prep Video** | executeCommand | `prep.sh` — ficha, silencios, 30fps, audio |
| 4 | **Check Prep** | code | Verifica exit code |
| 5 | **Whisper API** | httpRequest | POST `http://whisper-api:9000/` (timeout 600s) |
| 6 | **Save Transcript** | code | Guarda transcript.json, crea captions.json |
| 7 | **Build Captions** | code | Aplica FIXES/SPLITS, formato milliseconds |
| 8 | **Medir** | executeCommand | `medir.sh` — cortes de plano, tira, regla |
| 9 | **Check Medir** | code | Verifica exit code |
| 10 | **Human Review Pause** | webhook | Espera POST `/webhook/video-resume` |
| 11 | **Apply Modifications** | code | Aplica tokens y privacy masks del humano |
| 12 | **Remotion Render** | httpRequest | POST `http://remotion:3000/api/render` |
| 13 | **Store Render ID** | code | Guarda renderJobId para polling |
| 14 | **Poll Render** | httpRequest | GET `http://remotion:3000/api/render/{jobId}` |
| 15 | **Render Done?** | if | Evalúa `status == "completed"` |
| 16 | **Render Success** | code | Marca render completado |
| 17 | **QA Pause** | webhook | Espera POST `/webhook/video-qa-resume` |
| 18 | **Check QA** | code | Verifica `approved == true` |
| 19 | **Mix Audio** | executeCommand | `mix-audio.py` — voz + música + SFX |
| 20 | **Final Output** | code | Marca pipeline completado |
| 21 | **Respond Success** | respondToWebhook | Devuelve JSON final |
| 22 | **Wait Retry** | code | Prepara reintento de polling |
| 23 | **Wait 5s** | wait | Espera 5 segundos |
| 24 | **Increment Poll** | code | Incrementa contador, timeout check |

### Mecanismo de pausa webhook

**Pausa 1 — Revisión de footage (después de medir.sh):**

El workflow se pausa en el nodo "Human Review Pause" y espera una llamada HTTP.

```bash
# 1. El workflow genera outputs en:
ls /workspace/videos/work/<video-name>/mapa/tira.png    # tira de contactos
ls /workspace/videos/work/<video-name>/mapa/regla.png   # regla de medición

# 2. El humano revisa los outputs y edita archivos:
#    - tokens.ts (PANEL.top, SEAM.top, CAPTION_CY)
#    - privacy.tsx (MASKS: regiones de blur)
#    - Reel.tsx (S_SCREEN, S_FACE2, S_SPLIT)

# 3. El humano confirma:
curl -X POST http://10.0.5.16:30109/webhook/video-resume \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "job_xxx",
    "tokens": {"PANEL": {"top": 880}, "SEAM": {"top": 790}},
    "privacy": {"MASKS": [{"from": 18.4, "to": 21.8, "rects": [[250, 300, 600, 470]]}]}
  }'
```

**Pausa 2 — QA de frames (después de Remotion render):**

El workflow se pausa en el nodo "QA Pause" y espera confirmación.

```bash
# 1. El humano renderiza frames QA:
npx remotion still Reel qa/f1.png --frame=0
npx remotion still Reel qa/f100.png --frame=100
npx remotion still Reel qa/f500.png --frame=500

# 2. Revisa que:
#    - Ninguna tarjeta tapa una cara
#    - Ningún texto se sale de la caja segura
#    - Los reveals escalonados no aparecen vacíos
#    - Ninguna tarjeta repite la voz de ese segundo

# 3. Aprueba:
curl -X POST http://10.0.5.16:30109/webhook/video-qa-resume \
  -H "Content-Type: application/json" \
  -d '{"jobId": "job_xxx", "approved": true, "notes": "Looks good"}'
```

### Input del workflow

```json
{
  "video-name": "mi-video",
  "language": "es",
  "fixes": {"95.76": "experto"},
  "splits": {"50.64": ["Claude", "Code"]}
}
```

### Output del workflow

```json
{
  "success": true,
  "jobId": "job_1234567890_mi-video",
  "videoName": "mi-video",
  "finalOutput": "/workspace/videos/work/mi-video/out/final.mp4"
}
```

### Cómo probar el pipeline

**1. Subir video de prueba:**
```bash
scp video-prueba.mp4 truenas_admin@10.0.5.16:/mnt/Aodnas/Docker/videos/input/
```

**2. Activar el workflow en n8n:**
- Abrir `http://10.0.5.16:30109`
- Activar el workflow "Video Editing Pipeline"

**3. Ejecutar el pipeline:**
```bash
curl -X POST http://10.0.5.16:30109/webhook/video-pipeline \
  -H "Content-Type: application/json" \
  -d '{"video-name": "video-prueba", "language": "es"}'
```

**4. Responder pausa 1 (después de medir.sh):**
```bash
curl -X POST http://10.0.5.16:30109/webhook/video-resume \
  -H "Content-Type: application/json" \
  -d '{"jobId": "<jobId-del-output-anterior>"}'
```

**5. Responder pausa 2 (después de Remotion render):**
```bash
curl -X POST http://10.0.5.16:30109/webhook/video-qa-resume \
  -H "Content-Type: application/json" \
  -d '{"jobId": "<jobId>", "approved": true}'
```

**6. Verificar resultado:**
```bash
ssh -i ~/.ssh/id_ed25519_github truenas_admin@10.0.5.16
ls -la /mnt/Aodnas/Docker/videos/work/video-prueba/out/
# → final.mp4
```

### API de Remotion

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/render` | POST | Crear job de render |
| `/api/render/:jobId` | GET | Estado del job |
| `/api/render` | GET | Listar todos los jobs |
| `/api/render/:jobId` | DELETE | Cancelar job |

---

## Errores resueltos durante el despliegue

### 1. Imagen oficial n8n no tiene gestor de paquetes

`ghcr.io/n8n-io/n8n` es Docker Hardened (Alpine). No hay `apt-get`, `apk`, ni `npm` para instalar ffmpeg/python.

**Solución:** Construir desde `node:24-bookworm-slim` e instalar `n8n@2.35.0` via npm.

### 2. n8n@2.35.0 falla con Node 20

`isolated-vm` (dependencia nativa de n8n) requiere compilación con `node-gyp`. Con Node 20 falla silenciosamente.

**Solución:** Usar `node:24-bookworm-slim` (n8n@2.35.0 requiere Node >= 22).

### 3. `build-essential` necesario para n8n

Sin `build-essential`, `node-gyp` no puede compilar `isolated-vm`. El error es `make failed with exit code: 2`.

**Solución:** Agregar `build-essential` al Dockerfile.

### 4. Whisper incompatible con CUDA 11.4

`yoeven/insanely-fast-whisper-api:latest` necesita CUDA 12.3+ (driver 545+). La GT 740 (Kepler) solo soporta driver 470.x (CUDA 11.4). CUDA 12+ eliminó soporte para Kepler.

**Solución:** API custom con `faster-whisper` en CPU, modelo medium. La GT 740 es demasiado débil (2GB VRAM, 384 cores) para acelerar Whisper large-v3 de forma significativa.

### 5. NVENC no funciona en contenedores con GT 740

El `nvidia-container-runtime` 1.19.1 no puede inicializar CUDA en contenedores con el GT 740 (Kepler). `cuInit(0)` retorna 999 (`CUDA_ERROR_UNKNOWN`) incluso con `runtime: nvidia`, `privileged: true`, y todas las env vars NVIDIA configuradas. La imagen oficial `nvidia/cuda:11.8.0` tampoco funciona (retorna 100, `CUDA_ERROR_NO_DEVICE`).

**Solución:** Usar `libx264` (CPU) para transcodificación. Funciona perfecto, solo es más lento que NVENC.

### 6. Puerto de Whisper API

El README original indicaba puerto 8080. Whisper real escucha en puerto 9000.

**Solución:** Ajustar healthcheck a `http://localhost:9000/health`.

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| ffmpeg en CPU es más lento que NVENC | Suficiente para pipeline batch, 10-20 min por video |
| Whisper en CPU es más lento | Modelo medium (no large-v3), suficiente para batch |
| `truenas_admin` sin acceso a `docker exec` | Usar `midclt` o TrueNAS UI para logs |
| Chromium necesita librerías X11 | Incluir en Dockerfile las dependencias |
| Modelo whisper se descarga en primera ejecución | `start_period: 60s` en healthcheck |

---

## Upgrade a GPU (futuro)

Si se cambia a una GPU compatible (GTX 1060 o superior, Pascal o posterior):

1. Actualizar `nvidia-container-runtime` a versión >= 1.14
2. Agregar al servicio n8n en docker-compose:
   ```yaml
   runtime: nvidia
   environment:
     - NVIDIA_VISIBLE_DEVICES=all
     - NVIDIA_DRIVER_CAPABILITIES=compute,utility,video
   ```
3. Para whisper con GPU, cambiar imagen a `yoeven/insanely-fast-whisper-api:latest` y agregar `runtime: nvidia`

**GPUs compatibles:** GTX 1050 Ti o superior (Pascal, compute capability >= 5.0)

---

## Notas

- **Todo funciona en CPU:** ffmpeg usa `libx264`, whisper usa `faster-whisper` en CPU. Sin aceleración por GPU.
- **Whisper self-hosted:** Modelo medium en CPU. Para workflows batch (no real-time), la velocidad es aceptable.
- **Costo de tokens:** El pipeline consume tokens de IA (análisis de frames). Whisper es local, sin costo.
- **Tiempo de procesamiento:** 10-20 minutos según tamaño del video. No es un render, es un proceso de decisiones.
- **Transcribir.sh usa hyperframes:** El script `transcribir.sh` usa `npx hyperframes transcribe` con whisper medium local, no la API de whisper.

---

## Arquitectura externa: FFmpeg por SSH

FFmpeg y los scripts auxiliares vivirán en otro repositorio, dentro de un
contenedor de scripts. n8n ejecutará esos scripts mediante SSH. No se creará un
servicio HTTP `ffmpeg-api` en este repositorio.

### Restricciones de despliegue

- Los archivos `docker-compose` se administran desde la GUI web de TrueNAS.
- Este repositorio conservará una copia completa del compose usado en TrueNAS.
- Los servicios internos usarán la red externa existente:
  `ix-internal-n8n-n8n-net`.
- El procesamiento será exclusivamente por CPU. No se usará NVIDIA, CUDA,
  NVENC ni `runtime: nvidia`.
- La imagen y el servicio actuales de n8n no se modificarán.
- El contenedor de scripts compartirá el volumen `/workspace/videos` con n8n.
- El acceso SSH usará una clave dedicada y una cuenta restringida.

### Contenedor externo de scripts

```text
n8n ──SSH──> scripts ──> ffmpeg/ffprobe
                  │
                  └── /workspace/videos compartido
```

El contenedor se conectará a la misma red externa y montará el mismo volumen:

```text
ix-internal-n8n-n8n-net
```

El volumen compartido será:

```text
/mnt/Aodnas/Docker/videos:/workspace/videos
```

La declaración prevista para el compose es:

```yaml
networks:
  n8n-net:
    external: true
    name: ix-internal-n8n-n8n-net
```

La red debe existir antes de desplegar el stack desde TrueNAS; el compose no
intentará crearla.

### Ejecución de scripts

Los scripts deben aceptar argumentos controlados y escribir estado, logs y
salidas dentro del directorio de trabajo. Ejemplos de operaciones:

```text
probe
prepare_video
extract_audio
mix_audio
export_reel
```

Cada script debe devolver un código de salida no cero ante errores. Para tareas
largas, debe escribir `status.json` y `progress.log`; n8n puede consultar esos
archivos o esperar el comando SSH según la operación.

### Operaciones iniciales

El contenedor no aceptará comandos FFmpeg arbitrarios. Usará operaciones con
argumentos controlados:

- `probe`: inspeccionar duración, resolución y streams con `ffprobe`.
- `prepare_video`: crear el máster a 30 fps y extraer el audio.
- `extract_audio`: generar el audio mono a 16 kHz para Whisper.
- `mix_audio`: mezclar voz, música y efectos.
- `export_reel`: generar el MP4 final para Reels/TikTok.

Las rutas serán validadas dentro de `/workspace/videos`, con un directorio
aislado por trabajo:

```text
/workspace/videos/work/<job_id>/
├── request.json
├── status.json
├── progress.log
├── output.partial.mp4
└── output.mp4
```

El resultado final mantendrá la ruta usada actualmente por el pipeline:

```text
/workspace/videos/work/<video-name>/out/final.mp4
```

### Flujo de n8n

El workflow se reconstruirá desde cero con este flujo:

```text
[Webhook]
  → [Inicializar trabajo]
  → [SSH scripts: prepare_video]
  → [POST whisper-api]
  → [Guardar transcript y captions]
  → [SSH scripts: probe/medición]
  → [Pausa de revisión humana]
  → [POST remotion: crear render]
  → [Polling Remotion]
  → [Pausa de QA]
  → [SSH scripts: mix_audio/export_reel]
  → [Respuesta final]
```

Las llamadas que hoy ejecutan FFmpeg directamente dentro de n8n se migrarán a
scripts SSH una por una. Esto permite validar cada etapa sin cambiar la imagen
actual de n8n.

### Archivos del repositorio externo

```text
scripts-container/
├── Dockerfile
├── scripts/
│   ├── probe.sh
│   ├── prepare_video.sh
│   ├── extract_audio.sh
│   ├── mix_audio.sh
│   └── export_reel.sh
└── ssh/
    └── authorized_keys

docker-compose.yaml
docker-compose.truenas.yaml
n8n-workflow-video-pipeline.json
```

`docker-compose.truenas.yaml` será la copia completa destinada a pegarse en la
GUI de TrueNAS. El compose del proyecto será la fuente de verdad para futuras
modificaciones.

### Orden de implementación

1. Crear la imagen CPU del contenedor de scripts con FFmpeg y FFprobe.
2. Configurar SSH restringido y autenticación por clave.
3. Montar el volumen compartido en n8n y en el contenedor de scripts.
4. Añadir validación de rutas y operaciones FFmpeg controladas.
5. Conectar el contenedor a `ix-internal-n8n-n8n-net`.
6. Crear el workflow n8n usando SSH, Whisper y Remotion.
7. Probar con un vídeo real del volumen compartido.
8. Documentar el procedimiento exacto para desplegar y actualizar desde TrueNAS.

La configuración anterior de FFmpeg dentro de n8n se conserva en las secciones
históricas de este documento hasta que el nuevo servicio sea validado en
producción.
