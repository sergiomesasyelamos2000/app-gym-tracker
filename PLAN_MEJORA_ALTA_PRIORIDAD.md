# Plan de Mejora - Alta Prioridad
## Proyecto: Gym Tracker App

---

## 📋 Tabla de Contenidos

1. [Consolidar Gestión de Estado](#1-consolidar-gestión-de-estado)
2. [Mejorar Tipos TypeScript](#2-mejorar-tipos-typescript)
3. [Centralizar Manejo de Errores](#3-centralizar-manejo-de-errores)
4. [Memoizar Componentes y Cálculos](#4-memoizar-componentes-y-cálculos)
5. [Cronograma de Implementación](#cronograma-de-implementación)

---

## 1. Consolidar Gestión de Estado

### 🎯 Objetivo
Eliminar la duplicidad entre Redux Toolkit y Zustand, consolidando toda la gestión de estado en una única solución.

### 📊 Estado Actual
```
Redux Toolkit:
  - src/store/store.ts
  - src/store/chatSlice.ts (único slice)

Zustand:
  - src/store/useWorkoutInProgressStore.ts
  - src/store/useNutritionStore.ts
  - src/store/useNavigationStore.ts
  - src/store/useAuthStore.ts
```

### 🤔 Decisión: Migrar a Zustand Completamente

**Razones:**
- ✅ Menos boilerplate (no necesitas actions, reducers, dispatch)
- ✅ Mejor performance (re-renders más granulares)
- ✅ API más simple y directa
- ✅ Ya tienes 4 stores en Zustand vs 1 en Redux
- ✅ Mejor soporte para TypeScript
- ✅ Integración natural con AsyncStorage
- ✅ Más fácil de testear

### 📝 Plan de Implementación Detallado

#### **Fase 1: Preparación (Día 1 - Mañana)**

**1.1. Auditoría del estado actual**
```bash
# Crear archivo de análisis
touch MIGRATION_PLAN.md

# Listar todos los usos de Redux en el proyecto
grep -r "useSelector\|useDispatch" src/ > redux_usage.txt
grep -r "chatSlice\|chatActions" src/ >> redux_usage.txt
```

**1.2. Crear el nuevo store de Chat en Zustand**

Ver archivo completo en: `src/store/useChatStore.ts`

Estructura del store:
- Estados: sessions, currentSessionId, isLoading, error
- Getters: getCurrentSession, getSessionMessages
- Acciones: createSession, deleteSession, addMessage, updateMessage, etc.
- Persistencia con AsyncStorage

#### **Fase 2: Migración Gradual (Día 1 - Tarde)**

**2.1. Patrón de migración**

Antes (Redux):
```typescript
const messages = useSelector((state: RootState) => state.chat.messages);
const dispatch = useDispatch();
dispatch(addMessage({ role: 'user', content: text }));
```

Después (Zustand):
```typescript
const currentSession = useChatSelectors.currentSession();
const addMessage = useChatStore((state) => state.addMessage);
addMessage({ role: 'user', content: text });
```

**2.2. Checklist de migración**
- [ ] Identificar todos los componentes que usan Redux
- [ ] Migrar componente por componente
- [ ] Actualizar imports
- [ ] Probar funcionalidad
- [ ] Verificar persistencia

#### **Fase 3: Limpieza (Día 2 - Mañana)**

**3.1. Eliminar Redux**
```bash
rm src/store/store.ts
rm src/store/chatSlice.ts
npm uninstall @reduxjs/toolkit react-redux
```

**3.2. Actualizar App.tsx**
Eliminar `<Provider store={store}>` (Zustand no lo necesita)

#### **Fase 4: Testing (Día 2 - Tarde)**

**4.1. Tests del store**
- Session management
- Message management
- Loading/Error states
- Persistencia

**4.2. Tests de integración**
- Enviar mensajes
- Crear/eliminar sesiones
- Cambiar entre sesiones

### ✅ Checklist de Validación

```markdown
## Pre-migración
- [ ] Crear backup del proyecto
- [ ] Documentar estado actual
- [ ] Identificar componentes

## Durante migración
- [ ] Crear useChatStore.ts
- [ ] Crear tests
- [ ] Migrar componentes
- [ ] Actualizar imports

## Post-migración
- [ ] Eliminar Redux
- [ ] Actualizar App.tsx
- [ ] Ejecutar tests
- [ ] Probar manualmente
- [ ] Verificar performance
```

---

## 2. Mejorar Tipos TypeScript

### 🎯 Objetivo
Eliminar todos los `any`, mejorar la seguridad de tipos y crear un sistema de tipos robusto.

### 📊 Problemas Actuales

```typescript
// ❌ Error handling con any
catch (error: any) { }

// ❌ Type assertions inseguras
(producto as any).servingUnit

// ❌ Conversiones manuales
unit === "g" ? "gram" : unit
```

### 📝 Plan de Implementación

#### **Fase 1: Configuración Estricta (Día 3 - Mañana)**

**1.1. Actualizar tsconfig.json**
```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

**1.2. Crear tipos globales**
Archivo: `src/types/global.d.ts`

Tipos a crear:
- `Nullable<T>`, `Optional<T>`, `Maybe<T>`
- `ApiResponse<T>`, `ApiError`
- `AsyncState<T>`
- `Result<T, E>`

#### **Fase 2: Type Mappers (Día 3 - Tarde)**

**2.1. Crear mappers de unidades**
Archivo: `src/types/mappers/unitMappers.ts`

```typescript
export type LocalFoodUnit = 'g' | 'ml' | 'portion';

export const localToApiUnit = (unit: LocalFoodUnit): FoodUnit => {
  const mapping: Record<LocalFoodUnit, FoodUnit> = {
    g: 'gram',
    ml: 'ml',
    portion: 'portion',
  };
  return mapping[unit];
};
```

**2.2. Crear Type Guards**
Archivo: `src/types/guards/index.ts`

Guards a crear:
- `isApiResponse<T>`
- `isApiError`
- `isProduct`
- `isDefined<T>`
- `isNonEmptyString`

#### **Fase 3: Eliminar `any` (Día 4)**

**3.1. Script para encontrar `any`**
```bash
grep -rn ": any\|<any>\|as any" src/ > any-usage-report.txt
```

**3.2. Patrón de migración**
```typescript
// ANTES
catch (error: any) {
  console.error(error.message);
}

// DESPUÉS
catch (error) {
  if (error instanceof AppError) {
    console.error(error.message, error.code);
  } else if (error instanceof Error) {
    console.error(error.message);
  }
}
```

### ✅ Checklist de Validación

```markdown
- [ ] tsconfig.json actualizado
- [ ] Tipos globales creados
- [ ] Type mappers implementados
- [ ] Type guards creados
- [ ] Cero usos de `any`
- [ ] `npx tsc --noEmit` sin errores
```

---

## 3. Centralizar Manejo de Errores

### 🎯 Objetivo
Sistema centralizado y consistente para manejar todos los errores.

### 📝 Plan de Implementación

#### **Fase 1: Error Handler (Día 5 - Mañana)**

**1.1. Clases de error**
Archivo: `src/types/errors.ts`

```typescript
export abstract class AppError extends Error {
  abstract code: string;
  abstract statusCode: number;
}

export class NetworkError extends AppError {
  code = 'NETWORK_ERROR';
  statusCode = 0;
}

export class AuthenticationError extends AppError {
  code = 'AUTH_ERROR';
  statusCode = 401;
}
```

**1.2. Error Handler Central**
Archivo: `src/services/errorHandler/ErrorHandler.ts`

Funcionalidades:
- Normalizar errores
- Log a consola
- Enviar a analytics
- Mostrar mensajes user-friendly
- Patrón Result para async

**1.3. Hook useErrorHandler**
Archivo: `src/hooks/useErrorHandler.ts`

```typescript
export const useErrorHandler = (options) => {
  const handleError = useCallback((error: unknown) => {
    errorHandler.handle(error, options.context);
  }, [options]);

  return { handleError, handleAsyncError };
};
```

#### **Fase 2: Integrar con API (Día 5 - Tarde)**

**2.1. Actualizar apiFetch**
```typescript
// Lanzar AppError específicos según status HTTP
if (response.status === 401) {
  throw new AuthenticationError('Sesión expirada');
}
```

**2.2. Wrapper para servicios**
```typescript
export async function safeServiceCall<T>(
  operation: () => Promise<T>,
  serviceName: string
): Promise<Result<T, AppError>> {
  return errorHandler.handleAsync(operation, serviceName);
}
```

#### **Fase 3: Migrar Componentes (Día 6)**

**3.1. Patrón de migración**
```typescript
// ANTES
try {
  const data = await fetch();
} catch (error: any) {
  Alert.alert('Error', error.message);
}

// DESPUÉS
const { handleAsyncError } = useErrorHandler();
const result = await handleAsyncError(() => fetch());
if (result.success) {
  // usar result.data
}
```

### ✅ Checklist de Validación

```markdown
- [ ] ErrorHandler creado
- [ ] useErrorHandler hook
- [ ] apiFetch actualizado
- [ ] Servicios migrados
- [ ] Componentes migrados
- [ ] Probar todos los tipos de error
```

---

## 4. Memoizar Componentes y Cálculos

### 🎯 Objetivo
Optimizar performance usando React.memo, useMemo y useCallback.

### 📝 Plan de Implementación

#### **Fase 1: Identificar Componentes (Día 7 - Mañana)**

**1.1. Instalar herramientas**
```bash
npm install -D @welldone-software/why-did-you-render
```

**1.2. Componentes prioritarios**
- ExerciseCard (renderiza muchas veces)
- ExerciseSetRow (en listas)
- ProductDetailScreen (cálculos pesados)
- MacrosScreen (cálculos complejos)
- WorkoutScreen (muchos hijos)

#### **Fase 2: Optimizar (Día 7 - Tarde)**

**2.1. Template de optimización**

ANTES:
```typescript
export default function Component({ data }) {
  const styles = StyleSheet.create({...}); // ❌
  const calculate = () => {...}; // ❌
  return <View>...</View>;
}
```

DESPUÉS:
```typescript
export const Component = React.memo(({ data }) => {
  const styles = useMemo(() =>
    StyleSheet.create({...}), [theme]
  ); // ✅

  const result = useMemo(() =>
    calculate(), [data]
  ); // ✅

  return <View>...</View>;
}, (prev, next) => {
  // Comparación personalizada
});
```

**2.2. Checklist por componente**
```markdown
- [ ] Medir renders iniciales
- [ ] Aplicar React.memo
- [ ] useMemo para cálculos
- [ ] useCallback para funciones
- [ ] useMemo para estilos
- [ ] Medir mejoras
```

### ✅ Checklist de Validación

```markdown
- [ ] React DevTools instalado
- [ ] Top 10 componentes identificados
- [ ] Componentes optimizados
- [ ] Mejoras medidas con Profiler
- [ ] Documentar patrones
```

---

## Cronograma de Implementación

### Semana Completa (7 días)

```
┌─────────────┬─────────────────────────────────────┐
│    DÍA      │            TAREAS                   │
├─────────────┼─────────────────────────────────────┤
│  Día 1 AM   │ • Auditoría Redux/Zustand           │
│             │ • Crear useChatStore                │
├─────────────┼─────────────────────────────────────┤
│  Día 1 PM   │ • Migrar componentes a Zustand      │
├─────────────┼─────────────────────────────────────┤
│  Día 2 AM   │ • Eliminar Redux                    │
│             │ • Limpiar código                    │
├─────────────┼─────────────────────────────────────┤
│  Día 2 PM   │ • Tests del nuevo store             │
│             │ • Validación completa               │
├─────────────┼─────────────────────────────────────┤
│  Día 3 AM   │ • Configurar TS strict              │
│             │ • Crear tipos globales              │
├─────────────┼─────────────────────────────────────┤
│  Día 3 PM   │ • Type mappers                      │
│             │ • Type guards                       │
├─────────────┼─────────────────────────────────────┤
│  Día 4 AM   │ • Crear clases de error             │
│             │ • Error Handler central             │
├─────────────┼─────────────────────────────────────┤
│  Día 4 PM   │ • Eliminar todos los any            │
│             │ • Migrar tipos en componentes       │
├─────────────┼─────────────────────────────────────┤
│  Día 5 AM   │ • Hook useErrorHandler              │
│             │ • Integrar con API                  │
├─────────────┼─────────────────────────────────────┤
│  Día 5 PM   │ • Wrapper de servicios              │
│             │ • Actualizar apiFetch               │
├─────────────┼─────────────────────────────────────┤
│  Día 6      │ • Migrar componentes                │
│             │ • Probar manejo de errores          │
├─────────────┼─────────────────────────────────────┤
│  Día 7 AM   │ • Instalar herramientas             │
│             │ • Analizar performance              │
├─────────────┼─────────────────────────────────────┤
│  Día 7 PM   │ • Optimizar componentes             │
│             │ • Medir mejoras                     │
└─────────────┴─────────────────────────────────────┘
```

### Progreso Diario

**Día 1-2: Estado (25% completo)**
- Zustand implementado
- Redux eliminado
- Tests pasando

**Día 3-4: Tipos (50% completo)**
- TypeScript strict
- Cero `any`
- Type system robusto

**Día 5-6: Errores (75% completo)**
- Error Handler central
- Componentes migrados
- API integrada

**Día 7: Performance (100% completo)**
- Componentes memoizados
- Mejoras medibles
- Documentación completa

---

## Métricas de Éxito

### Antes de la Implementación
```
❌ 2 sistemas de estado (Redux + Zustand)
❌ 47 usos de `any` en el código
❌ Error handling inconsistente
❌ 0 componentes memoizados
❌ Renders innecesarios en listas
```

### Después de la Implementación
```
✅ 1 sistema de estado (Zustand)
✅ 0 usos de `any`
✅ Error handling centralizado
✅ Top 10 componentes memoizados
✅ 40% menos renders
```

---

## Recursos Adicionales

### Documentación
- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [React Performance](https://react.dev/learn/render-and-commit)

### Herramientas
- React DevTools Profiler
- Why Did You Render
- TypeScript Compiler (`tsc --noEmit`)

### Archivos Clave a Crear
```
src/
├── store/
│   └── useChatStore.ts (nuevo)
├── types/
│   ├── global.d.ts (nuevo)
│   ├── errors.ts (nuevo)
│   ├── mappers/
│   │   └── unitMappers.ts (nuevo)
│   └── guards/
│       └── index.ts (nuevo)
├── services/
│   └── errorHandler/
│       └── ErrorHandler.ts (nuevo)
└── hooks/
    └── useErrorHandler.ts (nuevo)
```

---

## Notas Importantes

### ⚠️ Precauciones
1. **Hacer commits frecuentes** - Cada fase debe ser un commit
2. **Tests antes y después** - Validar que todo funciona
3. **Probar en dispositivo real** - No solo en simulador
4. **Backup antes de empezar** - Branch nueva para la refactorización

### 💡 Tips
1. **No hacer todo a la vez** - Seguir el cronograma día por día
2. **Validar cada paso** - No avanzar si algo no funciona
3. **Documentar cambios** - Actualizar CLAUDE.md al final
4. **Pedir revisión** - Code review antes de merge

### 🎯 Criterio de Finalización
- [ ] Todos los checklist completados
- [ ] Todos los tests pasando
- [ ] App funciona igual que antes
- [ ] Performance mejorada (medido con Profiler)
- [ ] Documentación actualizada
- [ ] Code review aprobado

---

**Última actualización:** 2025-02-12
**Autor:** Plan generado por Claude Code
**Estado:** Listo para implementación
