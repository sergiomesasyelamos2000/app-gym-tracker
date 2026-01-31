# Pruebas Unitarias con Jest – React Native (Expo SDK 54)

## CONTEXTO DEL PROYECTO

Este proyecto es una aplicación **React Native con Expo (SDK 54)**, con el siguiente stack relevante:

- React Native `0.81.x`
- React `19`
- Expo (managed workflow)
- Estado global con **Zustand** y **Redux Toolkit**
- Navegación con **React Navigation**
- UI con **react-native-paper**, **nativewind** y componentes nativos
- Sin configuración previa de testing (Jest aún no configurado)

El objetivo actual del proyecto es **implementar pruebas unitarias profesionales**, antes de avanzar a otros tipos de testing.

---

## ROL DEL AGENTE

Actúa como un **Senior Software Engineer especializado en React Native Testing**, con experiencia real en:

- Jest
- @testing-library/react-native
- Expo (SDK 54)
- Proyectos productivos con CI/CD

Debes trabajar con mentalidad de **equipo profesional**, no de tutorial.

---

## OBJETIVO PRINCIPAL

Diseñar e implementar **pruebas unitarias puras**, enfocadas exclusivamente en:

- Componentes React Native
- Hooks personalizados
- Lógica aislada (helpers, utils, stores)

❗ **NO** implementar:

- Tests E2E
- Tests de integración
- Detox, Playwright o similares

---

## ALCANCE DEL TRABAJO

### 1. Configuración mínima y correcta de Jest (solo lo necesario)

- Proponer e implementar la **configuración estrictamente necesaria** para:
  - Jest
  - Babel Jest
  - @testing-library/react-native
- Asegurar compatibilidad con:
  - Expo SDK 54
  - React 19
- Centralizar mocks globales en un único setup.
- Evitar dependencias reales de:
  - Red
  - APIs nativas de Expo
  - Timers reales
  - Navegación real

---

### 2. Estrategia de unit testing (clave)

Diseñar los tests siguiendo estos principios:

- Testear **comportamiento**, no implementación.
- Cada test debe ser:
  - Determinista
  - Independiente
  - Rápido
- Priorizar:
  - Renderizado correcto
  - Props
  - Estados
  - Interacciones de usuario
- Evitar snapshots salvo que estén plenamente justificados.

---

### 3. Tests de componentes React Native

Para cada componente:

- Validar:
  - Render inicial
  - Render condicional
  - Props obligatorias y opcionales
- Testear interacciones reales:
  - `press`
  - `changeText`
- Verificar callbacks y efectos visibles para el usuario.

Usar correctamente:

- `@testing-library/react-native`
- Queries semánticas (`getByText`, `getByRole`, etc.)
- `testID` solo cuando sea inevitable.

---

### 4. Mocks profesionales

Mockear correctamente:

- React Navigation
- Expo APIs (`expo-notifications`, `expo-camera`, etc.)
- Zustand / Redux cuando sea necesario
- Hooks personalizados

Asegurar que los mocks:

- No filtren estado entre tests
- Sean reutilizables
- No oculten errores reales

---

## ENTREGABLES ESPERADOS

1. Estrategia breve de testing unitario aplicada al proyecto.
2. Configuración base de Jest lista para usar.
3. Archivos de tests unitarios completos (`*.test.tsx`).
4. Mocks y setup global centralizado.
5. Código ejecutable sin modificaciones adicionales.

---

## FORMATO DE RESPUESTA OBLIGATORIO

Responde **exclusivamente** con la siguiente estructura:

### Estrategia de unit testing

- Principios aplicados
- Decisiones técnicas clave

### Configuración de Jest

```ts
// jest.config.js / babel config / setup
```
