# Constitucion del proyecto

Version: 1.1.0

Esta constitucion gobierna las specs, implementaciones y despliegues del
proyecto. Su finalidad es proporcionar herramientas independientes que n8n pueda
orquestar para editar videos.

## Articulo I: Mision y alcance

- El sistema debe ayudar a n8n a convertir grabaciones en Reels verticales
  listos para revision editorial.
- El alcance es un pipeline editorial completo: preparacion, transcripcion,
  captions, composicion, privacidad, audio, medicion y exportacion.
- El usuario principal es un editor individual que trabaja en espanol y revisa
  manualmente los resultados.
- La revision humana es obligatoria antes del render final o la publicacion.

## Articulo II: Responsabilidades de los servicios

- n8n orquesta el workflow y conserva su responsabilidad de integracion.
- `whisper-api` proporciona transcripcion local con timestamps por palabra.
- `remotion` proporciona composicion visual, captions, overlays y render.
- FFmpeg y los scripts auxiliares serán responsabilidad del repositorio externo
  del contenedor de scripts; n8n los ejecutará mediante SSH.
- n8n, PostgreSQL y Redis/Valkey ya existen y quedan fuera de este repositorio.
  Este proyecto no los crea, modifica ni administra.

## Articulo III: Despliegue

- Los servicios propios se despliegan manualmente desde la GUI de TrueNAS.
- El Compose versionado describe unicamente `remotion` y `whisper-api`.
- El contenedor externo de scripts se despliega por separado y comparte el
  volumen de videos con n8n.
- Ambos servicios deben conectarse a la red externa
  `ix-internal-n8n-n8n-net`.
- No se publican APIs internas al host salvo una necesidad de prueba explícita.
- Los servicios comparten `/workspace/videos` para intercambiar archivos.

## Articulo IV: Integracion y seguridad

- Whisper y Remotion se comunican mediante HTTP interno.
- FFmpeg y los scripts se invocan mediante SSH desde n8n.
- Las operaciones largas exponen healthcheck, estados, errores y polling cuando
  corresponda.
- Las rutas de archivos se limitan al volumen compartido.
- Las credenciales reales permanecen en `.env`, excluido de Git.
- El acceso SSH debe usar una cuenta restringida y comandos/scripts controlados.
- No se aceptan comandos FFmpeg arbitrarios sin validación en el contenedor.
- El procesamiento inicial es CPU-only: sin CUDA, NVENC ni `runtime: nvidia`.

## Articulo V: Calidad editorial y operativa

- Cada etapa debe poder validarse de forma independiente antes de integrarse.
- Los captions deben conservar sincronizacion por palabra.
- Las tarjetas y overlays deben aportar contraste, consecuencia o contexto, no
  repetir mecánicamente lo que se está oyendo.
- El pipeline debe producir un resultado recuperable después de reiniciar un
  contenedor.
- La aceptación requiere probar un Reel real y revisar captions, privacidad,
  audio, formato vertical y salida final.

## Articulo VI: Cambios

Cualquier cambio de misión, audiencia, servicio administrado, red o estrategia
de despliegue debe actualizar primero esta constitucion y después las specs
dependientes.
