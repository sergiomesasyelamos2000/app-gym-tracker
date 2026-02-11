# 🔄 Ejemplos Prácticos de Migración al Sistema Offline-First

## Ejemplo 1: Migrar WorkoutScreen (Crear Rutina)

### ANTES (Solo Online)

```typescript
// src/features/routine/screens/WorkoutScreen.tsx

import { saveRoutine } from '../services/routineService';

const handleCreateRoutine = async () => {
  try {
    setLoading(true);

    const routine = {
      title: 'Mi Rutina',
      userId: user.id,
      exercises: selectedExercises,
    };

    const result = await saveRoutine(routine);

    Alert.alert('Éxito', 'Rutina creada');
    navigation.goBack();
  } catch (error) {
    Alert.alert('Error', 'No se pudo crear la rutina');
  } finally {
    setLoading(false);
  }
};
```

### DESPUÉS (Offline-First)

```typescript
// src/features/routine/screens/WorkoutScreen.tsx

import { saveRoutineOffline } from '../../../services/offline/routineOfflineService';
import { useNetworkStatus } from '../../../hooks/useNetworkStatus';

const handleCreateRoutine = async () => {
  try {
    setLoading(true);

    const routine = {
      title: 'Mi Rutina',
      userId: user.id,
      exercises: selectedExercises,
    };

    // Funciona offline y online automáticamente
    const result = await saveRoutineOffline(routine);

    Alert.alert('Éxito', 'Rutina guardada');
    navigation.goBack();
  } catch (error) {
    Alert.alert('Error', 'No se pudo guardar la rutina');
  } finally {
    setLoading(false);
  }
};

// Opcional: Mostrar estado de red
const { isConnected } = useNetworkStatus();

// En el render:
{!isConnected && (
  <Text style={styles.offlineWarning}>
    📴 Modo offline - Los cambios se sincronizarán cuando haya conexión
  </Text>
)}
```

---

## Ejemplo 2: Migrar RoutineDetailScreen (Mostrar Rutina)

### ANTES (Solo Online)

```typescript
// src/features/routine/screens/RoutineDetailScreen.tsx

import { getRoutineById } from '../services/routineService';

useEffect(() => {
  async function loadRoutine() {
    try {
      setLoading(true);
      const data = await getRoutineById(routineId);
      setRoutine(data);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar la rutina');
    } finally {
      setLoading(false);
    }
  }

  loadRoutine();
}, [routineId]);
```

### DESPUÉS (Offline-First)

```typescript
// src/features/routine/screens/RoutineDetailScreen.tsx

import { getRoutineByIdOffline } from '../../../services/offline/routineOfflineService';

useEffect(() => {
  async function loadRoutine() {
    try {
      setLoading(true);

      // Busca primero en SQLite, luego en API si es necesario
      const data = await getRoutineByIdOffline(routineId);

      if (data) {
        setRoutine(data);
      } else {
        Alert.alert('Error', 'Rutina no encontrada');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar la rutina');
    } finally {
      setLoading(false);
    }
  }

  loadRoutine();
}, [routineId]);
```

---

## Ejemplo 3: Migrar MacrosScreen (Añadir Comida)

### ANTES (Solo Online)

```typescript
// src/features/nutrition/screens/MacrosScreen.tsx

import * as nutritionService from '../services/nutritionService';

const handleAddFood = async (product: any, quantity: number, mealType: string) => {
  try {
    const entry = {
      userId: user.id,
      productCode: product.code,
      productName: product.name,
      date: todayDate,
      mealType,
      quantity,
      unit: 'g',
      calories: product.calories * (quantity / 100),
      protein: product.protein * (quantity / 100),
      carbs: product.carbs * (quantity / 100),
      fat: product.fat * (quantity / 100),
    };

    await nutritionService.saveFoodEntry(entry);

    // Recargar entradas
    const entries = await nutritionService.getFoodEntriesByDate(user.id, todayDate);
    setTodayEntries(entries);

    Alert.alert('Éxito', 'Comida añadida');
  } catch (error) {
    Alert.alert('Error', 'No se pudo añadir la comida');
  }
};
```

### DESPUÉS (Offline-First)

```typescript
// src/features/nutrition/screens/MacrosScreen.tsx

import {
  saveFoodEntryOffline,
  getFoodEntriesOffline,
} from '../../../services/offline/nutritionOfflineService';

const handleAddFood = async (product: any, quantity: number, mealType: string) => {
  try {
    const entry = {
      userId: user.id,
      productCode: product.code,
      productName: product.name,
      date: todayDate,
      mealType,
      quantity,
      unit: 'g',
      calories: product.calories * (quantity / 100),
      protein: product.protein * (quantity / 100),
      carbs: product.carbs * (quantity / 100),
      fat: product.fat * (quantity / 100),
    };

    // Guarda offline y encola para sincronización
    await saveFoodEntryOffline(entry);

    // Recargar desde SQLite (incluye datos no sincronizados)
    const entries = await getFoodEntriesOffline(user.id, todayDate);
    setTodayEntries(entries);

    Alert.alert('Éxito', 'Comida añadida');
  } catch (error) {
    Alert.alert('Error', 'No se pudo añadir la comida');
  }
};
```

---

## Ejemplo 4: Migrar ProductListScreen (Listar Productos)

### ANTES (Solo Online)

```typescript
// src/features/nutrition/screens/ProductListScreen.tsx

import * as nutritionService from '../services/nutritionService';

useFocusEffect(
  useCallback(() => {
    async function loadProducts() {
      try {
        setLoading(true);
        const products = await nutritionService.getCustomProducts(user.id);
        setCustomProducts(products);
      } catch (error) {
        Alert.alert('Error', 'No se pudieron cargar los productos');
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, [user.id])
);
```

### DESPUÉS (Offline-First)

```typescript
// src/features/nutrition/screens/ProductListScreen.tsx

import { getCustomProductsOffline } from '../../../services/offline/nutritionOfflineService';
import { useSyncStore } from '../../../store/useSyncStore';

useFocusEffect(
  useCallback(() => {
    async function loadProducts() {
      try {
        setLoading(true);

        // Carga desde SQLite (incluye productos no sincronizados)
        const products = await getCustomProductsOffline(user.id);
        setCustomProducts(products);
      } catch (error) {
        Alert.alert('Error', 'No se pudieron cargar los productos');
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, [user.id])
);

// Opcional: Recargar cuando se completa una sincronización
const { lastSyncAt } = useSyncStore();

useEffect(() => {
  if (lastSyncAt) {
    loadProducts(); // Recargar después de sincronizar
  }
}, [lastSyncAt]);
```

---

## Ejemplo 5: Crear Componente con Indicador de Sincronización

```typescript
// src/components/OfflineIndicator.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useSyncStore } from '../store/useSyncStore';
import { syncService } from '../services/syncService';

export function OfflineIndicator() {
  const { isConnected } = useNetworkStatus();
  const { pendingOperations, isSyncing } = useSyncStore();

  if (isConnected && pendingOperations === 0) {
    return null; // Todo sincronizado
  }

  const handleSync = async () => {
    await syncService.forceSync();
  };

  return (
    <View style={styles.container}>
      <Ionicons
        name={isConnected ? 'cloud-upload-outline' : 'cloud-offline'}
        size={16}
        color={isConnected ? '#f59e0b' : '#ef4444'}
      />

      {!isConnected && (
        <Text style={styles.text}>Sin conexión - Trabajando offline</Text>
      )}

      {isConnected && pendingOperations > 0 && (
        <>
          <Text style={styles.text}>
            {isSyncing
              ? 'Sincronizando...'
              : `${pendingOperations} cambios pendientes`}
          </Text>
          {!isSyncing && (
            <TouchableOpacity onPress={handleSync} style={styles.button}>
              <Text style={styles.buttonText}>Sincronizar</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fef3c7',
    gap: 8,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400e',
    flex: 1,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f59e0b',
    borderRadius: 6,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
});

// Uso en cualquier pantalla:
<OfflineIndicator />
```

---

## Ejemplo 6: Hook Personalizado para Sincronización

```typescript
// src/hooks/useSyncAware.ts

import { useEffect, useState } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { useSyncStore } from '../store/useSyncStore';
import { syncService } from '../services/syncService';

/**
 * Hook que proporciona información sobre el estado de sincronización
 * y permite ejecutar acciones cuando cambia
 */
export function useSyncAware() {
  const { isConnected } = useNetworkStatus();
  const { isSyncing, pendingOperations, lastSyncAt } = useSyncStore();
  const [justSynced, setJustSynced] = useState(false);

  // Detectar cuando se completa una sincronización
  useEffect(() => {
    if (!isSyncing && pendingOperations === 0 && lastSyncAt) {
      setJustSynced(true);

      // Reset flag después de 2 segundos
      const timeout = setTimeout(() => setJustSynced(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [isSyncing, pendingOperations, lastSyncAt]);

  return {
    isOnline: isConnected,
    isSyncing,
    pendingChanges: pendingOperations,
    lastSync: lastSyncAt ? new Date(lastSyncAt) : null,
    justSynced,
    forceSync: () => syncService.forceSync(),
  };
}

// Uso en componente:
function MyScreen() {
  const { isOnline, pendingChanges, justSynced, forceSync } = useSyncAware();

  useEffect(() => {
    if (justSynced) {
      console.log('¡Datos sincronizados! Recargar...');
      loadData();
    }
  }, [justSynced]);

  return (
    <View>
      {!isOnline && <Text>📴 Modo offline</Text>}
      {pendingChanges > 0 && (
        <Button onPress={forceSync} title="Sincronizar ahora" />
      )}
    </View>
  );
}
```

---

## Ejemplo 7: Servicio Híbrido con Fallback

```typescript
// src/services/hybrid/routineServiceHybrid.ts

import NetInfo from '@react-native-community/netinfo';
import * as routineService from '../../features/routine/services/routineService';
import * as routineOfflineService from '../offline/routineOfflineService';

/**
 * Intenta guardar online primero, si falla usa offline
 */
export async function saveRoutineHybrid(routine: any): Promise<any> {
  const netState = await NetInfo.fetch();

  // Sin conexión, usar offline directamente
  if (!netState.isConnected || !netState.isInternetReachable) {
    console.log('No connection, saving offline');
    return await routineOfflineService.saveRoutineOffline(routine);
  }

  // Con conexión, intentar online
  try {
    console.log('Attempting online save');
    return await routineService.saveRoutine(routine);
  } catch (error) {
    console.log('Online save failed, falling back to offline', error);
    return await routineOfflineService.saveRoutineOffline(routine);
  }
}

/**
 * Obtiene rutinas, combinando local y remoto si hay conexión
 */
export async function getAllRoutinesHybrid(userId: string): Promise<any[]> {
  // Siempre cargar datos locales primero (respuesta instantánea)
  const localRoutines = await routineOfflineService.findAllRoutinesOffline(userId);

  const netState = await NetInfo.fetch();

  // Sin conexión, retornar solo locales
  if (!netState.isConnected || !netState.isInternetReachable) {
    return localRoutines;
  }

  // Con conexión, intentar obtener del servidor
  try {
    const remoteRoutines = await routineService.findAllRoutines();

    // TODO: Merge local + remote, eliminar duplicados
    // Por ahora, retornar solo remotas si hay conexión
    return remoteRoutines;
  } catch (error) {
    console.log('Failed to fetch remote, using local only', error);
    return localRoutines;
  }
}
```

---

## Tips Generales

### 1. Mostrar Estado de Red

```typescript
const { isConnected } = useNetworkStatus();

<View style={{ backgroundColor: isConnected ? '#10b981' : '#ef4444' }}>
  <Text>{isConnected ? '✓ Online' : '✗ Offline'}</Text>
</View>
```

### 2. Deshabilitar Botones Durante Sincronización

```typescript
const { isSyncing } = useSyncStore();

<Button
  title="Guardar"
  onPress={handleSave}
  disabled={isSyncing}
/>
```

### 3. Recargar Después de Sincronizar

```typescript
const { lastSyncAt } = useSyncStore();

useEffect(() => {
  loadData(); // Recargar cuando cambia lastSyncAt
}, [lastSyncAt]);
```

### 4. Indicador Visual de Datos No Sincronizados

```typescript
// Si tienes acceso al flag synced de SQLite
<View style={styles.item}>
  <Text>{item.name}</Text>
  {item.synced === 0 && (
    <Ionicons name="cloud-upload-outline" size={16} color="#f59e0b" />
  )}
</View>
```

---

¡Listo! Con estos ejemplos puedes migrar cualquier pantalla o componente al sistema offline-first.
