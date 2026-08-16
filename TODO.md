# TODO - Herramientas de video para n8n

Backlog de implementacion para servicios independientes que n8n pueda
orquestar en la creacion editorial de Reels.

## Fases

- [ ] Fase 1: Definir contratos comunes de herramientas HTTP.
- [ ] Fase 2: Crear la imagen CPU de `ffmpeg-api`.
- [ ] Fase 3: Implementar healthcheck y `probe` con FFprobe.
- [ ] Fase 4: Implementar cola local y ciclo de vida de jobs.
- [ ] Fase 5: Implementar progreso, cancelacion y errores.
- [ ] Fase 6: Implementar `prepare_video` y `extract_audio`.
- [ ] Fase 7: Implementar `mix_audio` y `export_reel`.
- [ ] Fase 8: Conectar `ffmpeg-api` a la red de TrueNAS.
- [ ] Fase 9: Crear el compose completo para la GUI de TrueNAS.
- [ ] Fase 10: Crear el workflow n8n desde cero.
- [ ] Fase 11: Integrar Whisper y persistencia de transcript/captions.
- [ ] Fase 12: Integrar Remotion y polling de renders.
- [ ] Fase 13: Ejecutar pruebas con un Reel real en CPU.
- [ ] Fase 14: Documentar despliegue, operacion y recuperacion.

## Fuera del alcance inicial

- Aceleracion GPU, CUDA o NVENC.
- Servicio multiusuario.
- Publicacion automatica en Instagram, TikTok o YouTube.
- Edicion generativa o decisiones editoriales totalmente autonomas.
