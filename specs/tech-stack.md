# Tech Stack

## Plataforma y despliegue

- TrueNAS 25.04.2.6.
- Contenedores desplegados manualmente desde la GUI web de TrueNAS.
- Red externa: `ix-internal-n8n-n8n-net`.
- Procesamiento exclusivamente por CPU.
- Volumen compartido: `/mnt/Aodnas/Docker/videos:/workspace/videos`.

## Orquestacion existente

- n8n 2.35.0 como orquestador existente.
- n8n, PostgreSQL y Redis/Valkey no son administrados por este repositorio.
- Los workflows llaman a las herramientas mediante HTTP interno.
- La imagen y los datos de n8n permanecen sin cambios.

## Servicios propios

- `whisper-api`: FastAPI, `faster-whisper`, modelo `medium`, CPU, timestamps
  por palabra.
- `remotion`: Node.js, Chromium, Express y Remotion para captions, overlays y
  composición visual.
- `ffmpeg-api`: servicio externo, implementado y desplegado desde el repositorio
  del contenedor de scripts. Este repositorio solo consumirá su contrato HTTP.

## Contratos y almacenamiento

- Las herramientas reciben peticiones JSON por HTTP.
- Los archivos no se envían entre servicios como payload; se intercambian por
  rutas bajo `/workspace/videos`.
- Las operaciones largas deben identificarse con `job_id` y consultarse por
  polling cuando su duración lo requiera.
- Las rutas de entrada y salida deben permanecer confinadas al volumen.
- Ningún servicio debe aceptar comandos FFmpeg arbitrarios.

## Brechas prioritarias

- Crear y activar el workflow n8n que llame a Whisper y Remotion.
- Definir contratos de transcripción, captions, render y errores.
- Persistir transcript, captions, estados y rutas de cada trabajo.
- Implementar pausas de revisión humana y QA.
- Validar el pipeline completo con un Reel real en CPU.
- Integrar el `ffmpeg-api` del repositorio externo después de validar Whisper y
  Remotion.

## Restricciones

- No incluir `runtime: nvidia`, CUDA, NVENC ni dependencias GPU.
- No publicar las APIs internas al host salvo una prueba concreta.
- No acoplar Whisper o Remotion a una imagen modificada de n8n.
- Mantener secretos en `.env`, excluido del repositorio.
