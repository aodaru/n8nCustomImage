# Tech Stack

## Plataforma

- TrueNAS 25.04.2.6.
- Docker Compose administrado desde la GUI web de TrueNAS.
- Red externa: `ix-internal-n8n-n8n-net`.
- Procesamiento exclusivamente por CPU.
- Volumen compartido del pipeline:
  `/mnt/Aodnas/Docker/videos:/workspace/videos`.

## Orquestacion

- n8n 2.35.0 como orquestador.
- Los workflows llaman a las herramientas mediante HTTP interno.
- La imagen actual de n8n se conserva sin cambios durante la migracion.
- El workflow nuevo se reconstruira desde cero para evitar depender de la
  instalacion recuperada.

## Herramientas

- `ffmpeg-api`: FastAPI/Uvicorn, FFmpeg y FFprobe, con jobs CPU.
- `whisper-api`: FastAPI con `faster-whisper`, modelo `medium`, CPU.
- `remotion`: Node.js, Chromium y Remotion para composicion visual.
- PostgreSQL y Valkey/Redis permanecen como servicios de n8n.

## Contratos y almacenamiento

- Las herramientas reciben peticiones JSON por HTTP.
- Los archivos no se envian entre servicios como payload; se intercambian por
  rutas dentro de `/workspace/videos`.
- Los trabajos se identifican con `job_id` y se consultan mediante polling.
- Las rutas de entrada y salida deben estar confinadas al volumen de videos.
- FFmpeg se ejecuta con argumentos estructurados, nunca con shell concatenado.

## Brechas tecnicas prioritarias

- No existe aun el contenedor `ffmpeg-api` ni su Dockerfile.
- No existe un contrato comun de jobs entre FFmpeg, Whisper y Remotion.
- El flujo anterior ejecuta FFmpeg directamente dentro de n8n.
- No hay una implementacion persistente y aislada de cola, progreso,
  cancelacion y limpieza de jobs FFmpeg.
- La instalacion real se administra desde TrueNAS, pero el compose completo
  debe quedar versionado en este repositorio.

## Restricciones

- No incluir `runtime: nvidia`, CUDA, NVENC ni dependencias GPU.
- No publicar las APIs internas al host salvo que una prueba concreta lo
  requiera.
- No permitir comandos FFmpeg arbitrarios desde n8n.
- No acoplar el procesamiento de video a la imagen de n8n.
