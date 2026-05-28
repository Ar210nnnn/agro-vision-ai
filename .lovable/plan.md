## Plan de implementación

Vamos a transformar Agro Inteligente en una app multi-usuario premium. Lo haré en **4 fases** porque el resto depende de tener Auth + Perfil funcionando primero.

---

### FASE 1 — Login + Perfil personal (base de todo)

**Backend (migración SQL):**
- Tabla `profiles`: `user_id`, `display_name`, `avatar_url`, `location_name` (ej "Finca La Esperanza"), `bio`
- Trigger `handle_new_user` → crea perfil automáticamente al registrarse
- Añadir columna `user_id` (nullable) a `plant_analyses` para vincular cada escaneo a su dueño
- RLS: cada usuario solo ve/edita sus propios análisis y perfil
- Mantener compatibilidad: los análisis viejos sin `user_id` siguen visibles para el dueño anónimo

**Frontend:**
- Página `/auth` con tabs **Iniciar sesión** / **Crear cuenta** (email/password + botón Google)
- Página `/profile` para editar nombre, avatar, ubicación
- Componente `AuthGuard` que redirige a `/auth` si no hay sesión
- Header muestra avatar + nombre del usuario, menú con "Mi perfil" y "Cerrar sesión"
- Listener `onAuthStateChange` en `App.tsx`

---

### FASE 2 — Flash / Linterna nativa

- Instalar `@capacitor/core` ya está; añadir plugin `@capawesome/capacitor-torch` (funciona iOS+Android)
- Botón flash en `WebcamCapture` que llama `Torch.enable()` / `Torch.disable()`
- Fallback en web: usar `MediaStreamTrack.applyConstraints({ torch: true })` cuando el navegador lo soporte (Chrome Android)
- Auto-sugerencia: si la luz ambiente es baja (detectada vía análisis del frame), parpadear el botón flash

---

### FASE 3 — Mapa de mis plantas

- Añadir columnas `latitude`, `longitude`, `plant_nickname` a `plant_analyses`
- Al capturar, pedir `navigator.geolocation` (o `@capacitor/geolocation` en nativo) y guardar coordenadas
- Nueva pestaña **"Mapa"** con `react-leaflet` (gratis, sin API key) mostrando marcadores
- Marcadores coloreados por salud (verde/amarillo/rojo)
- Click en marcador → popup con miniatura + diagnóstico

---

### FASE 4 — Evolución temporal con IA

- Sistema de "Mis Plantas": agrupar escaneos por `plant_nickname` o `plant_id`
- Tabla `tracked_plants`: `id`, `user_id`, `nickname`, `species`, `created_at`
- Vista "Evolución" por planta: timeline de fotos + gráfico de salud en el tiempo
- Botón **"Comparar evolución"** → edge function que envía las 2-3 últimas fotos a Gemini con prompt: "Compara cronológicamente y dime si mejora, empeora o se mantiene + tendencia"
- Resultado: card con veredicto (📈 Mejora / 📉 Empeora / ➡️ Estable) + análisis textual

---

### Detalles técnicos

**Auth**: Lovable Cloud managed (email + Google). Sin auto-confirm de email (más seguro).
**Mapa**: Leaflet + OpenStreetMap (cero costo, cero API key).
**Flash en navegador**: API experimental `torch`, solo funciona en algunos Chrome móvil — el verdadero soporte completo llega cuando compilen con Capacitor.
**IA evolución**: reutiliza el edge function existente o crea `compare-evolution` con Gemini Pro multimodal.

---

### Orden de aprobación

Te recomiendo aprobar este plan completo y yo lo ejecuto **fase por fase** validando cada una antes de continuar. Si prefieres ejecutar solo 1-2 fases primero, dime cuáles.

¿Aprobamos?