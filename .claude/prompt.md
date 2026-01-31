# Pruebas de Integración – React Native Testing Library

## CONTEXTO DEL PROYECTO

Este proyecto es una aplicación **React Native con Expo (SDK 54)**.  
Se requiere implementar **pruebas de integración** que validen **flujos completos de usuario**, combinando múltiples componentes, hooks, stores y navegación.

Estas pruebas se ejecutan con **Jest + React Native Testing Library** y **NO son tests E2E**.

---

## ROL DEL AGENTE

Actúa como un **Senior Mobile Engineer especializado en React Native Testing**, con experiencia en:

- React Native Testing Library
- Expo
- Testing de flujos reales de usuario
- Arquitecturas con navegación y estado global

Tu responsabilidad es **validar flujos completos**, no unidades aisladas.

---

## OBJETIVO PRINCIPAL

Implementar **pruebas de integración profesionales** para validar:

- Registro completo de entrenamiento
- Uso del chatbot
- Navegación entre pantallas

Simulando el comportamiento real del usuario dentro de la app.

---

## ALCANCE DEL TRABAJO

### 1. Principios de integración testing

Las pruebas deben:

- Cubrir múltiples componentes trabajando juntos
- Simular interacciones reales del usuario
- Ejecutarse sin backend real
- Ser deterministas y estables

❗ No mockear componentes internos innecesariamente  
❗ No testear estilos o layout

---

### 2. Flujos a validar (obligatorio)

#### A. Registro de entrenamiento

- Usuario navega a la pantalla de entrenamiento
- Introduce datos (duración, tipo, calorías, etc.)
- Envía el formulario
- Se muestra confirmación o feedback esperado
- Se actualiza el estado global correctamente

#### B. Uso del chatbot

- Usuario abre el chatbot
- Introduce un mensaje
- Se muestra una respuesta simulada
- Se mantiene el historial del chat

#### C. Navegación entre pantallas

- Usuario navega entre tabs o stacks
- Se renderizan las pantallas correctas
- Se preserva o resetea estado cuando corresponde

---

### 3. Mocking estratégico

- Mockear:
  - APIs externas
  - Backend / fetch
  - Notificaciones
- NO mockear:
  - Navegación
  - Stores reales (Zustand / Redux)
  - Hooks de negocio

---

### 4. Testing Library – buenas prácticas

- Usar queries basadas en:
  - Texto visible
  - Accesibilidad
- Preferir:
  - `findBy*` para flujos asíncronos
  - `waitFor` cuando sea necesario
- Evitar:
  - `testID` salvo último recurso
  - Snapshots

---

## ENTREGABLES ESPERADOS

1. Estrategia breve de pruebas de integración.
2. Tests de integración completos para cada flujo.
3. Mocks controlados de APIs externas.
4. Código ejecutable sin modificaciones adicionales.

---

## FORMATO DE RESPUESTA OBLIGATORIO

Responde exclusivamente con la siguiente estructura:

### Flujos de integración cubiertos

- Registro de entrenamiento
- Chatbot
- Navegación

### Estrategia de integración

- Enfoque adoptado
- Decisiones técnicas clave

### Tests de integración

```ts
// Tests de integración completos con React Native Testing Library
```
