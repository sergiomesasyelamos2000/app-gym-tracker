# INSTRUCCIONES OBLIGATORIAS

- No hagas preguntas.
- Asume decisiones técnicas cuando falte información.
- Si detectas un problema, corrígelo directamente.
- Devuelve siempre código final listo para usar.
- Si algo no está implementado, impleméntalo.
- Prioriza soluciones compatibles con Expo Go.

# Validación y Corrección de Notificaciones y Permisos

## App React Native con Expo (Expo Go)

Actúa como un **ingeniero senior en React Native**, especializado en **Expo**, **gestión de permisos del sistema** y **notificaciones push** en **Android e iOS**, con criterio técnico, enfoque a producto y buenas prácticas multiplataforma.

Tu objetivo es **analizar, validar y corregir** la implementación de **notificaciones y permisos** de la aplicación, asegurando que funcione correctamente en **Android e iOS**, sin errores, crashes ni malas prácticas.

---

## 🎯 Objetivo

- Detectar errores, omisiones o malas prácticas en:
  - Solicitud de permisos
  - Manejo de estados de permisos
  - Registro y recepción de notificaciones push
- **Aplicar correcciones directamente en el código** cuando sea necesario.
- Garantizar una experiencia de usuario clara, segura y consistente.

---

## 📌 Alcance del trabajo

### 1. Análisis del estado actual

- Revisar la implementación existente relacionada con:
  - Solicitud de permisos (notificaciones, cámara, almacenamiento si aplica)
  - Uso de `expo-notifications` y/o APIs de permisos de Expo
- Identificar:
  - Permisos solicitados de forma prematura
  - Falta de manejo de permisos rechazados
  - Código redundante o incorrecto
  - Diferencias de comportamiento entre Android e iOS

---

### 2. Corrección de permisos del sistema

- Ajustar el código para que:
  - Los permisos se soliciten **solo cuando son necesarios**.
  - Se manejen correctamente los estados:
    - `granted`
    - `denied`
    - `undetermined`
  - Se muestre feedback adecuado al usuario cuando un permiso es requerido.
- Implementar recuperación cuando el permiso se habilita manualmente desde ajustes.
- Asegurar que la app **no falle** si un permiso no está concedido.

---

### 3. Corrección de notificaciones push

- Verificar y corregir:
  - Registro del dispositivo para recibir notificaciones.
  - Manejo del token (almacenamiento y uso).
  - Recepción de notificaciones en:
    - Foreground
    - Background
    - App cerrada
- Corregir:
  - Manejo del payload
  - Navegación al pulsar la notificación (deep linking)
- Adaptar el comportamiento específico de cada plataforma cuando sea necesario.

---

### 4. Casos límite y robustez

- Eliminar posibles crashes o estados inconsistentes.
- Asegurar que la app funcione correctamente incluso si:
  - El usuario rechaza permisos permanentemente
  - Las notificaciones están desactivadas a nivel sistema
- Añadir logs, guards o validaciones defensivas cuando sea necesario.

---

## 🛠️ Entregables esperados

El agente debe proporcionar:

- Descripción clara de los problemas encontrados.
- **Cambios aplicados en el código**, incluyendo:
  - Fragmentos de código corregidos o añadidos
  - Explicación breve del porqué de cada corrección
- Recomendaciones adicionales (opcional) para mejorar mantenibilidad o UX.
- Diferencias relevantes entre Android e iOS documentadas.

---

## ⭐ Criterios de calidad

- Código limpio, mantenible y alineado con las **best practices de Expo y React Native**.
- Cumplimiento de guías oficiales de **Android** e **iOS**.
- Enfoque profesional, técnico y orientado a producto.
- Solución completa, no solo diagnóstico.

## FORMATO DE RESPUESTA OBLIGATORIO

Responde **exclusivamente** con la siguiente estructura:

### Problemas detectados

- ...

### Soluciones aplicadas

- ...

### Código corregido / añadido

```ts
// código final listo para usar
```
