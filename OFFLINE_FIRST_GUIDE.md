# 📴 Sistema Offline-First - Guía Completa

## 🎯 ¿Qué es Offline-First?

El sistema offline-first permite a los usuarios usar la aplicación completamente sin conexión a internet. Todos los cambios se guardan localmente y se sincronizan automáticamente cuando hay conexión.

## ✨ Características

- ✅ **Trabajo 100% offline**: Crea, edita y elimina rutinas, ejercicios, comidas y productos sin conexión
- ✅ **Sincronización automática**: Los cambios se sincronizan cada 5 minutos cuando hay conexión
- ✅ **Cola de operaciones**: Las operaciones fallidas se reintentan automáticamente
- ✅ **Indicador visual**: Banner que muestra el estado de sincronización
- ✅ **Base de datos local**: SQLite para almacenamiento robusto
- ✅ **Resolución de conflictos**: Last-write-wins usando timestamps

## 📁 Arquitectura

### Componentes Principales

```
src/
├── database/
│   └── sqliteClient.ts          # Cliente SQLite y definición de tablas
├── services/
│   ├── offlineQueueService.ts   # Cola de sincronización
│   ├── syncService.ts            # Servicio principal de sincronización
│   └── offline/
│       ├── routineOfflineService.ts     # Operaciones offline de rutinas
│       └── nutritionOfflineService.ts   # Operaciones offline de nutrición
├── store/
│   └── useSyncStore.ts           # Estado de sincronización (Zustand)
├── hooks/
│   └── useNetworkStatus.ts       # Detección de conectividad
└── components/
    └── SyncProvider.tsx          # Provider que inicializa el sistema
```

### Flujo de Datos

```
Usuario realiza acción
    ↓
Guardar en SQLite local
    ↓
Añadir a cola de sincronización
    ↓
¿Hay conexión?
    ├─ SÍ  → Sincronizar inmediatamente
    └─ NO  → Esperar a tener conexión
               ↓
          Auto-sync cada 5 minutos
               ↓
          Sincronizar con backend
               ↓
          Actualizar estado local
```

## 🚀 Uso del Sistema

### 1. Operaciones con Rutinas

```typescript
import {
  saveRoutineOffline,
  findAllRoutinesOffline,
  updateRoutineOffline,
  deleteRoutineOffline,
} from '../services/offline/routineOfflineService';

// Crear una rutina (funciona offline)
const routine = {
  title: 'Entrenamiento de Pecho',
  totalTime: 3600,
  userId: user.id,
  exercises: [
    {
      exerciseId: 'exercise-123',
      exerciseName: 'Press Banca',
      sets: [
        { weight: 80, reps: 10, completed: false },
        { weight: 80, reps: 10, completed: false },
      ],
    },
  ],
};

const savedRoutine = await saveRoutineOffline(routine);

// Obtener todas las rutinas (incluye datos locales y sincronizados)
const routines = await findAllRoutinesOffline(user.id);

// Actualizar una rutina
await updateRoutineOffline(routineId, {
  title: 'Nuevo título',
  totalTime: 4200,
});

// Eliminar una rutina (soft delete)
await deleteRoutineOffline(routineId);
```

### 2. Operaciones con Nutrición

```typescript
import {
  saveFoodEntryOffline,
  getFoodEntriesOffline,
  saveCustomProductOffline,
  getCustomProductsOffline,
} from '../services/offline/nutritionOfflineService';

// Añadir entrada de comida
const foodEntry = {
  userId: user.id,
  productCode: 'product-123',
  productName: 'Pollo a la plancha',
  date: '2026-02-11',
  mealType: 'lunch',
  quantity: 200,
  unit: 'g',
  calories: 330,
  protein: 62,
  carbs: 0,
  fat: 7,
};

await saveFoodEntryOffline(foodEntry);

// Obtener entradas del día
const entries = await getFoodEntriesOffline(user.id, '2026-02-11');

// Crear producto personalizado
const customProduct = {
  userId: user.id,
  name: 'Mi Proteína Casera',
  caloriesPer100: 120,
  proteinPer100: 25,
  carbsPer100: 5,
  fatPer100: 2,
};

await saveCustomProductOffline(customProduct);
```

### 3. Verificar Estado de Sincronización

```typescript
import { syncService } from '../services/syncService';
import { useSyncStore } from '../store/useSyncStore';

// Obtener estado de sincronización
const { pending, lastSync, isSyncing } = await syncService.getSyncStatus();

console.log(`Operaciones pendientes: ${pending}`);
console.log(`Última sincronización: ${lastSync}`);
console.log(`Sincronizando: ${isSyncing}`);

// Usar el store en componentes React
function MyComponent() {
  const { isSyncing, pendingOperations, lastSyncAt } = useSyncStore();

  return (
    <View>
      <Text>Estado: {isSyncing ? 'Sincronizando...' : 'Listo'}</Text>
      <Text>Operaciones pendientes: {pendingOperations}</Text>
      {lastSyncAt && (
        <Text>
          Última sincronización: {new Date(lastSyncAt).toLocaleTimeString()}
        </Text>
      )}
    </View>
  );
}
```

### 4. Forzar Sincronización Manual

```typescript
import { syncService } from '../services/syncService';

// En un botón o evento
const handleSync = async () => {
  const result = await syncService.forceSync();

  console.log(`Sincronizadas: ${result.synced}`);
  console.log(`Errores: ${result.errors}`);
};
```

### 5. Detectar Conectividad

```typescript
import { useNetworkStatus } from '../hooks/useNetworkStatus';

function MyComponent() {
  const { isConnected, isInternetReachable, type } = useNetworkStatus();

  return (
    <View>
      <Text>Conectado: {isConnected ? 'Sí' : 'No'}</Text>
      <Text>Internet: {isInternetReachable ? 'Sí' : 'No'}</Text>
      <Text>Tipo: {type}</Text>
    </View>
  );
}
```

## 🔄 Migrar Servicios Existentes

Para migrar un servicio existente al modelo offline-first:

### Opción 1: Usar servicios offline directamente

```typescript
// Antes (solo online)
import { saveRoutine } from '../services/routineService';

// Después (offline-first)
import { saveRoutineOffline } from '../services/offline/routineOfflineService';

// El resto del código permanece igual
const routine = await saveRoutineOffline(routineData);
```

### Opción 2: Crear wrapper híbrido (recomendado)

```typescript
// services/routineServiceHybrid.ts
import { saveRoutine } from './routineService';
import { saveRoutineOffline } from './offline/routineOfflineService';
import NetInfo from '@react-native-community/netinfo';

export async function saveRoutineHybrid(routine: any) {
  const netState = await NetInfo.fetch();

  // Si hay conexión, intentar guardar online primero
  if (netState.isConnected && netState.isInternetReachable) {
    try {
      return await saveRoutine(routine);
    } catch (error) {
      // Si falla, guardar offline
      console.log('Online save failed, saving offline');
      return await saveRoutineOffline(routine);
    }
  }

  // Sin conexión, guardar offline directamente
  return await saveRoutineOffline(routine);
}
```

## 📊 Tablas SQLite

### Rutinas

- `routines`: Información básica de rutinas
- `routine_exercises`: Ejercicios de cada rutina
- `sets`: Sets de cada ejercicio
- `routine_sessions`: Sesiones completadas

### Nutrición

- `food_entries`: Entradas de diario alimenticio
- `custom_products`: Productos personalizados
- `custom_meals`: Comidas personalizadas

### Sistema

- `sync_queue`: Cola de operaciones pendientes

Todas las tablas tienen:
- `synced`: 0 = pendiente, 1 = sincronizado
- `deleted`: 0 = activo, 1 = eliminado (soft delete)
- Timestamps: `createdAt`, `updatedAt`

## ⚙️ Configuración

### Cambiar intervalo de sincronización

```typescript
// En SyncProvider.tsx o al inicializar
await syncService.startAutoSync(10); // Cada 10 minutos
```

### Cambiar número máximo de reintentos

```typescript
// En services/syncService.ts
const MAX_RETRY_ATTEMPTS = 5; // Cambiar a deseado
```

### Cambiar tamaño de lote de sincronización

```typescript
// En services/syncService.ts
const SYNC_BATCH_SIZE = 50; // Sincronizar 50 operaciones a la vez
```

## 🐛 Debugging

### Ver operaciones pendientes

```typescript
import { getPendingOperations } from '../services/offlineQueueService';

const pending = await getPendingOperations();
console.log('Operaciones pendientes:', pending);
```

### Limpiar operaciones fallidas

```typescript
import { cleanupFailedOperations } from '../services/offlineQueueService';

// Eliminar operaciones que han fallado más de 3 veces
await cleanupFailedOperations(3);
```

### Resetear estado de sincronización

```typescript
import { useSyncStore } from '../store/useSyncStore';

useSyncStore.getState().resetSync();
```

## 🚨 Consideraciones Importantes

1. **IDs Únicos**: Se generan IDs con UUID localmente para evitar colisiones
2. **Timestamps**: Todas las operaciones incluyen timestamps para resolución de conflictos
3. **Soft Deletes**: Las eliminaciones son lógicas (flag `deleted = 1`) para poder sincronizarlas
4. **Cache de Red**: NetInfo mantiene un estado local de conectividad
5. **Gestión de Errores**: Las operaciones fallidas se reintentan automáticamente
6. **Límite de Reintentos**: Después de 3 intentos fallidos, la operación se elimina de la cola

## 📈 Próximas Mejoras

- [ ] Sincronización delta (solo cambios desde última sincronización)
- [ ] Compresión de datos para reducir uso de red
- [ ] Métricas de sincronización
- [ ] Resolución manual de conflictos
- [ ] Exportar/importar base de datos local
- [ ] Sincronización selectiva (por tipo de entidad)

## 🆘 Troubleshooting

### La sincronización no funciona

1. Verificar conectividad: `useNetworkStatus()`
2. Revisar errores en sync store: `useSyncStore().syncErrors`
3. Verificar cola pendiente: `getPendingOperations()`
4. Forzar sincronización manual: `syncService.forceSync()`

### Los datos no aparecen después de sincronizar

1. Verificar que la operación se completó: `useSyncStore().pendingOperations`
2. Recargar datos desde el servicio correspondiente
3. Revisar logs del backend para errores de API

### Base de datos SQLite corrupta

```typescript
import { closeDatabase, initDatabase } from '../database/sqliteClient';

// Cerrar y reinicializar
await closeDatabase();
await initDatabase();
```

## 📞 Soporte

Para problemas o preguntas sobre el sistema offline-first, contacta al equipo de desarrollo.
