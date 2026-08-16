# TODO - Herramientas de video para n8n

Backlog de implementación para servicios independientes que n8n pueda
orquestar en la edición editorial de Reels.

## Fases

- [ ] Fase 1: Definir contratos HTTP y validar red/volúmenes.
- [ ] Fase 2: Desplegar y verificar `whisper-api` en TrueNAS.
- [ ] Fase 3: Desplegar y verificar `remotion` en TrueNAS.
- [ ] Fase 4: Crear workflow n8n mínimo con Whisper y Remotion.
- [ ] Fase 5: Persistir transcript, captions, jobs y resultados.
- [ ] Fase 6: Añadir pausas de revisión editorial y QA.
- [ ] Fase 7: Probar un Reel real completo en CPU.
- [ ] Fase 8: Implementar el contenedor externo de scripts con FFmpeg.
- [ ] Fase 9: Integrar ejecución SSH y volumen compartido con n8n.
- [ ] Fase 10: Documentar despliegue, operación y recuperación desde TrueNAS.

## Fuera del alcance inicial

- Crear o modificar el contenedor n8n existente.
- Crear o modificar PostgreSQL o Redis/Valkey de n8n.
- Aceleración GPU, CUDA o NVENC.
- Servicio multiusuario.
- Publicación automática en Instagram, TikTok o YouTube.
- Edición generativa o decisiones editoriales totalmente autónomas.
