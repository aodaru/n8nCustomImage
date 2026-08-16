# Mision

Proporcionar a n8n un conjunto de herramientas independientes para convertir
grabaciones de talking-head y screencasts en Reels verticales listos para
revision editorial y publicacion.

El producto no reemplaza a n8n ni al criterio del editor. n8n coordina el
pipeline; cada servicio especializado procesa una parte verificable del video.

## Resultado esperado

- Preparacion de video y audio para procesamiento posterior.
- Transcripcion local con timestamps por palabra mediante Whisper.
- Captions corregibles y sincronizados.
- Composicion visual, overlays y tarjetas mediante Remotion.
- Proteccion de datos visibles y medicion de planos.
- Audio mezclado y exportacion en formato vertical 9:16.
- Archivo H.264/AAC listo para revision editorial.

## Usuario objetivo

El usuario principal es un editor individual que produce contenido en espanol a
partir de talking-heads y screencasts. El flujo prioriza decisiones editoriales
revisables antes de renderizar y publicar.

## Principios

- n8n orquesta; los servicios procesan.
- Whisper y Remotion se integran primero para validar el flujo de extremo a
  extremo.
- Las herramientas se comunican por HTTP interno y comparten archivos por
  `/workspace/videos`.
- El despliegue es manual desde la GUI de TrueNAS y CPU-only.
- Los resultados deben ser recuperables tras reinicios.
- La automatizacion ayuda al editor, pero no elimina sus pausas de revisión.

## Fuera del alcance inicial

- Crear o administrar el contenedor n8n.
- Crear o administrar PostgreSQL o Redis/Valkey de n8n.
- Plataforma multiusuario o servicio SaaS.
- Publicacion automatica en redes sociales.
- Edicion generativa o decisiones editoriales totalmente autonomas.
- CUDA, NVENC o aceleracion GPU.
- La implementacion del contenedor externo de scripts y su ejecucion SSH.
