# Mision

Construir un conjunto de contenedores-herramienta independientes que n8n pueda
orquestar para convertir grabaciones de talking-head y screencasts en Reels
verticales listos para revision editorial y publicacion.

El sistema debe separar las responsabilidades de procesamiento: preparacion de
video, transcripcion, generacion de captions, composicion visual, mezcla de
audio, medicion, privacidad y exportacion. Cada herramienta debe comunicarse
por HTTP interno y compartir los archivos mediante el volumen de videos.

## Resultado esperado

- Un MP4 vertical 9:16, normalmente 1080x1920 a 30 fps.
- Subtitulos sincronizados por palabra.
- Graficos y overlays producidos por Remotion.
- Audio mezclado alrededor de -14 LUFS.
- H.264/AAC con `+faststart`, listo para revision editorial.

## Principios

- n8n orquesta; los contenedores procesan.
- Cada herramienta tiene un contrato HTTP explicito.
- Las herramientas no dependen de una imagen modificada de n8n.
- El procesamiento inicial es CPU-only.
- Los jobs y archivos deben ser recuperables despues de un reinicio.
- La revision humana conserva el control editorial antes del render final y la
  publicacion.

## Audiencia

El usuario principal es una persona o equipo editorial pequeno que produce
contenido propio. El flujo prioriza videos en espanol, talking-head,
screencasts y piezas verticales para Instagram Reels, con posible reutilizacion
posterior para TikTok y YouTube Shorts.

## No es objetivo

- Convertir el sistema en una plataforma multiusuario.
- Publicar automaticamente en redes sociales.
- Reemplazar el criterio editorial humano.
- Usar la GPU antigua del equipo.
