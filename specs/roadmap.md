# Roadmap

Orden de implementacion derivado de `TODO.md`. Cada fase debe ser pequena,
verificable y completarse antes de iniciar la siguiente.

## Fase 1: Contrato base

- [ ] Definir formato comun de request, response y estados.
- [ ] Definir politica de rutas bajo `/workspace/videos`.
- [ ] Definir formato de errores y healthchecks.

## Fase 2: Imagen FFmpeg

- [ ] Crear `ffmpeg-api/Dockerfile` CPU-only.
- [ ] Instalar FFmpeg, FFprobe, FastAPI y Uvicorn.
- [ ] Ejecutar el proceso con usuario no root.

## Fase 3: Probe

- [ ] Implementar `GET /health`.
- [ ] Implementar `probe` con FFprobe.
- [ ] Validar formatos, streams, duracion y rutas.

## Fase 4: Jobs

- [ ] Crear IDs y directorios aislados por job.
- [ ] Implementar cola local con concurrencia inicial de uno.
- [ ] Persistir request y status en el volumen.

## Fase 5: Control de ejecucion

- [ ] Ejecutar FFmpeg sin shell concatenado.
- [ ] Leer progreso con `-progress`.
- [ ] Implementar polling, cancelacion y errores.
- [ ] Escribir salidas parciales y publicar resultados atomicos.

## Fase 6: Preparacion

- [ ] Implementar `prepare_video` a 30 fps y H.264.
- [ ] Implementar `extract_audio` mono a 16 kHz.
- [ ] Mantener las rutas actuales de trabajo del pipeline.

## Fase 7: Audio y exportacion

- [ ] Implementar `mix_audio` con voz, musica y efectos.
- [ ] Implementar `export_reel` con H.264/AAC, BT.709 y `+faststart`.
- [ ] Verificar objetivo aproximado de -14 LUFS.

## Fase 8: Despliegue TrueNAS

- [ ] Conectar el servicio a `ix-internal-n8n-n8n-net`.
- [ ] Crear copia completa `docker-compose.truenas.yaml`.
- [ ] Documentar pegado, actualizacion y logs desde la GUI.

## Fase 9: Workflow n8n

- [ ] Crear workflow nuevo desde el webhook inicial.
- [ ] Reemplazar comandos FFmpeg locales por HTTP a las herramientas.
- [ ] Integrar Whisper y guardar transcript/captions.
- [ ] Integrar Remotion y su polling.
- [ ] Mantener pausa de revision humana y pausa de QA.

## Fase 10: Validacion

- [ ] Ejecutar el pipeline completo con un video real.
- [ ] Verificar captions, privacidad, audio y formato vertical.
- [ ] Verificar recuperacion despues de reiniciar un contenedor.
- [ ] Documentar operacion y criterios de aceptacion.
