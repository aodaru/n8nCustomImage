# Roadmap

Orden de implementación basado en `TODO.md`. Cada fase debe ser pequeña,
verificable y completarse antes de iniciar la siguiente.

## Fase 1: Contratos y entorno

- [ ] Definir request y response de `whisper-api`.
- [ ] Definir request y response de `remotion`.
- [ ] Confirmar red externa y volumen compartido en TrueNAS.
- [ ] Documentar healthchecks y formato común de errores.

## Fase 2: Validar Whisper

- [ ] Desplegar `whisper-api` manualmente desde la GUI de TrueNAS.
- [ ] Verificar `/health` desde el contenedor n8n existente.
- [ ] Ejecutar una transcripción de prueba con timestamps por palabra.
- [ ] Definir el formato persistido de `transcript.json`.

## Fase 3: Validar Remotion

- [ ] Desplegar `remotion` manualmente desde la GUI de TrueNAS.
- [ ] Verificar `/health` desde el contenedor n8n existente.
- [ ] Crear un render mínimo con captions de prueba.
- [ ] Verificar escritura de resultados en `/workspace/videos`.

## Fase 4: Workflow n8n mínimo

- [ ] Crear webhook de entrada y estado inicial del trabajo.
- [ ] Llamar a Whisper y persistir transcript/captions.
- [ ] Llamar a Remotion y guardar el `job_id` de render.
- [ ] Implementar polling, timeout y errores de render.

## Fase 5: Revisión editorial

- [ ] Añadir pausa de revisión de captions, planos y privacidad.
- [ ] Aplicar correcciones, tokens y máscaras aprobadas por el editor.
- [ ] Añadir render de frames QA.
- [ ] Añadir pausa de aprobación QA antes de continuar.

## Fase 6: Pipeline real

- [ ] Integrar preparación, medición, audio y exportacion existentes.
- [ ] Ejecutar un Reel real en CPU.
- [ ] Verificar captions, privacidad, audio y formato vertical.
- [ ] Documentar recuperación tras reiniciar un contenedor.

## Fase 7: Integración del contenedor de scripts por SSH

- [ ] Implementar el contenedor de scripts en el repositorio externo.
- [ ] Añadir SSH restringido y autenticación por clave.
- [ ] Montar `/mnt/Aodnas/Docker/videos` como `/workspace/videos` en n8n y
  scripts.
- [ ] Ejecutar scripts controlados desde n8n mediante SSH.
- [ ] Migrar operaciones FFmpeg desde n8n una por una.
