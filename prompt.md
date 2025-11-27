PROMPT PARA CLAUDE 4.5 — IMPLEMENTACIÓN DE FEATURES EN PROYECTO REACT NATIVE + EXPO

Quiero que actúes como Senior Software Engineer especializado en React Native + Expo, experto en arquitectura mobile, optimización de rendimiento, diseño escalable de apps, y además como Senior Mobile UX/UI Designer.

Voy a darte mi proyecto completo de React Native desarrollado con Expo. Tu objetivo será leer, analizar y comprender la arquitectura, las pantallas, componentes, stores/contexts, hooks, navegación, servicios y assets, y a partir de ello proponer y después implementar todas estas features con código real, listo para copiar y pegar, asegurando:

Arquitectura modular y coherente con lo que ya existe.

Código limpio, seguro, eficiente y mantenible.

Mejoras de UX/UI alineadas con mobile best-practices (iOS + Android).

Evitar breaking changes.

Explicar dónde colocar cada archivo y cómo integrarlo.

Asegúrate de no inventarte carpetas ni patrones si en el proyecto ya existe una forma de hacerlo:
Adáptate totalmente a su arquitectura actual y, si detectas problemas, propón mejoras razonadas.

FEATURES A IMPLEMENTAR

1. Notificaciones Push (Expo Notifications)

Implementar push notifications usando expo-notifications.

Integrar permisos, listeners y handlers.

Cuando el usuario termine una serie y se active un temporizador de descanso, enviar una push notification local.

Evitar notificaciones duplicadas.

Debe funcionar incluso app en background.

Debe ser configurable desde el usuario en settings (si el proyecto ya tiene settings, úsalos).

2. Exportar datos de entrenamiento y nutrición

Exportación en JSON y CSV.

Usar expo-file-system y expo-sharing.

Debe permitir exportar:

historial de entrenamientos

ejercicios por fecha

PRs

datos de nutrición/seguimiento calórico

UX: pantalla con selección de rango de fechas + tipo de datos.

Generar funciones reutilizables para formatear datos.

3. Gráfica de progreso por ejercicio

Crear una pantalla/detail view para cada ejercicio mostrando:

progresión de peso

progresión de repeticiones

1RM estimado

Usar una librería recomendada para Expo (por ejemplo react-native-chart-kit o victory-native si ya existe).

Cargar datos desde el storage/backend actual.

Añadir acceso desde:

ExerciseDetail

Historial

PRs

4. Detección de récords

Definir récord como mejora significativa:

si ayer → 10 reps × 20 kg

hoy → 8 reps × 25 kg

entonces es récord

Crear un servicio/utilidad que:

busque datos previos

compare volumen, peso o 1RM

marque la serie como “record”

muestre un mensaje visual motivacional (con confeti si procede)

Registrar récords en historial.

5. Confirmar entrenamientos cortos

Si el usuario inicia un entrenamiento pero abandona muy pronto:

antes de guardarlo en historial → mostrar modal:

“Este entrenamiento fue muy breve. ¿Quieres guardarlo o descartarlo?”

Detectar duración mínima (parametrizable).

Evitar falsos positivos.

Implementar sin romper la lógica actual de tracking.

6. Refactorizar componentes SetRow (mejor UX/UI)

Mejorar interacción:

campos más grandes

slider o stepper opcional

animaciones suaves

orden lógico táctil

Optimizar re-renders (useCallback, memo, etc.)

Separar UI de lógica si es necesario.

7. HomeScreen responsive

Hacer que el HomeScreen funcione tanto:

móviles pequeños

pantallas grandes

tablets

Usar:

useWindowDimensions

breakpoints

estilos escalables

Mantener coherencia visual con el resto del proyecto.

INSTRUCCIONES ADICIONALES

Quiero que:

A) Analices primero el proyecto completo

Describe brevemente su estructura.

Indica puntos débiles, duplicaciones, malas prácticas o mejoras rápidas.

Detecta patrones arquitectónicos existentes (Context, Zustand, Redux, servicios, hooks, etc).

B) Para cada feature

Explica cómo la implementarías en esta arquitectura concreta.

Muestra el código exacto de todos los archivos modificados o creados.

Indica dónde colocar cada archivo según la estructura real del proyecto.

Si hay alternativa mejor en UX, justifícala.

Asegúrate de que el código sea funcional en Expo.

C) Respeta estos criterios

Código tipado en TypeScript si el proyecto es TS.

Nada de código inventado: adapta y analiza lo que ya existe.

Mantén consistencia con los estilos y componentes existentes.

Si el proyecto tiene diseño propio → respétalo.

Si no lo tiene → crea un sistema de diseño simple, escalable.

FORMATO DE RESPUESTA

Quiero tu respuesta organizada así:

Análisis del proyecto

Problemas detectados y mejoras

Plan general de implementación

Implementación de cada feature (con código completo)

Conclusión y pasos siguientes
