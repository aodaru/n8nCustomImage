# Constitucion del proyecto

Version: 1.0.0

Esta constitucion define los limites y reglas que deben cumplir las specs,
implementaciones y despliegues de este repositorio.

## Articulo I: Alcance de despliegue

- Este repositorio administra unicamente las herramientas de procesamiento de
  video propias del proyecto.
- Los servicios propios son `remotion` y `whisper-api`.
- n8n ya existe y permanece fuera de este repositorio y de este Compose.
- PostgreSQL y Redis/Valkey pertenecen al despliegue existente de n8n y no se
  crean, modifican ni administran aqui.

## Articulo II: Despliegue en TrueNAS

- Los contenedores se despliegan manualmente desde la GUI de TrueNAS.
- El Compose versionado sirve como referencia reproducible para ese despliegue.
- Los servicios propios deben conectarse a la red externa
  `ix-internal-n8n-n8n-net`.
- No se publican puertos al host salvo que una prueba concreta lo justifique.

## Articulo III: Integracion

- n8n orquesta; Remotion y Whisper procesan.
- La comunicacion entre servicios se realiza mediante HTTP interno.
- Los archivos se comparten mediante `/workspace/videos`.
- Las APIs deben exponer contratos explicitos, healthchecks y errores
  verificables.

## Articulo IV: Seguridad y recursos

- No se almacenan credenciales reales en Git ni en archivos de ejemplo.
- Las variables sensibles se mantienen en `.env`, excluido del repositorio.
- No se aceptan comandos FFmpeg arbitrarios desde n8n.
- El procesamiento inicial es CPU-only: sin CUDA, NVENC ni `runtime: nvidia`.

## Articulo V: Calidad operativa

- Los jobs y archivos deben poder recuperarse tras reiniciar un contenedor.
- Las operaciones largas deben ofrecer polling, estados y errores claros.
- Toda etapa del pipeline debe poder validarse de forma independiente antes de
  integrarse en el workflow de n8n.
- La revision humana conserva el control editorial antes de la salida final.

## Articulo VI: Cambios a la constitucion

Cualquier cambio de alcance, servicio administrado, red o estrategia de
despliegue debe actualizar primero esta constitucion y despues las specs
dependientes.
