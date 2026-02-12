import * as SQLite from "expo-sqlite";

const DB_NAME = "gym_tracker_offline.db";

let db: SQLite.SQLiteDatabase | null = null;

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) {
    return db;
  }

  db = await SQLite.openDatabaseAsync(DB_NAME);

  // Create tables for offline storage
  await db.execAsync(`
    -- Routines table
    CREATE TABLE IF NOT EXISTS routines (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      totalTime INTEGER DEFAULT 0,
      userId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      synced INTEGER DEFAULT 0,
      deleted INTEGER DEFAULT 0
    );

    -- Routine Exercises table
    CREATE TABLE IF NOT EXISTS routine_exercises (
      id TEXT PRIMARY KEY,
      routineId TEXT NOT NULL,
      exerciseId TEXT NOT NULL,
      exerciseName TEXT,
      order_index INTEGER,
      restSeconds INTEGER,
      weightUnit TEXT DEFAULT 'kg',
      repsType TEXT DEFAULT 'reps',
      supersetWith TEXT,
      notes TEXT,
      synced INTEGER DEFAULT 0,
      deleted INTEGER DEFAULT 0,
      FOREIGN KEY (routineId) REFERENCES routines(id) ON DELETE CASCADE
    );

    -- Sets table
    CREATE TABLE IF NOT EXISTS sets (
      id TEXT PRIMARY KEY,
      routineExerciseId TEXT NOT NULL,
      order_index INTEGER,
      weight REAL,
      reps INTEGER,
      repsMin INTEGER,
      repsMax INTEGER,
      completed INTEGER DEFAULT 0,
      weightUnit TEXT DEFAULT 'kg',
      repsType TEXT DEFAULT 'reps',
      synced INTEGER DEFAULT 0,
      deleted INTEGER DEFAULT 0,
      FOREIGN KEY (routineExerciseId) REFERENCES routine_exercises(id) ON DELETE CASCADE
    );

    -- Routine Sessions table
    CREATE TABLE IF NOT EXISTS routine_sessions (
      id TEXT PRIMARY KEY,
      routineId TEXT NOT NULL,
      exercises TEXT NOT NULL,
      totalTime INTEGER,
      totalWeight INTEGER,
      completedSets INTEGER,
      createdAt TEXT NOT NULL,
      synced INTEGER DEFAULT 0,
      deleted INTEGER DEFAULT 0,
      FOREIGN KEY (routineId) REFERENCES routines(id)
    );

    -- Food Entries table
    CREATE TABLE IF NOT EXISTS food_entries (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      productCode TEXT,
      productName TEXT NOT NULL,
      productImage TEXT,
      date TEXT NOT NULL,
      mealType TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      customUnitName TEXT,
      customUnitGrams REAL,
      calories REAL NOT NULL,
      protein REAL NOT NULL,
      carbs REAL NOT NULL,
      fat REAL NOT NULL,
      sugar REAL,
      fiber REAL,
      sodium REAL,
      createdAt TEXT NOT NULL,
      synced INTEGER DEFAULT 0,
      deleted INTEGER DEFAULT 0
    );

    -- Custom Products table
    CREATE TABLE IF NOT EXISTS custom_products (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      image TEXT,
      brand TEXT,
      barcode TEXT,
      caloriesPer100 REAL NOT NULL,
      proteinPer100 REAL NOT NULL,
      carbsPer100 REAL NOT NULL,
      fatPer100 REAL NOT NULL,
      fiberPer100 REAL,
      sugarPer100 REAL,
      sodiumPer100 REAL,
      servingSize REAL,
      servingUnit TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      synced INTEGER DEFAULT 0,
      deleted INTEGER DEFAULT 0
    );

    -- Custom Meals table
    CREATE TABLE IF NOT EXISTS custom_meals (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      image TEXT,
      products TEXT NOT NULL,
      totalCalories REAL,
      totalProtein REAL,
      totalCarbs REAL,
      totalFat REAL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      synced INTEGER DEFAULT 0,
      deleted INTEGER DEFAULT 0
    );

    -- Sync Queue table (for tracking pending operations)
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      attempts INTEGER DEFAULT 0,
      last_error TEXT
    );

    -- Indices for better performance
    CREATE INDEX IF NOT EXISTS idx_routines_user ON routines(userId);
    CREATE INDEX IF NOT EXISTS idx_routines_synced ON routines(synced);
    CREATE INDEX IF NOT EXISTS idx_routine_exercises_routine ON routine_exercises(routineId);
    CREATE INDEX IF NOT EXISTS idx_sets_routine_exercise ON sets(routineExerciseId);
    CREATE INDEX IF NOT EXISTS idx_food_entries_user_date ON food_entries(userId, date);
    CREATE INDEX IF NOT EXISTS idx_food_entries_synced ON food_entries(synced);
    CREATE INDEX IF NOT EXISTS idx_custom_products_user ON custom_products(userId);
    CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue(entity_type, entity_id);
  `);

  return db;
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    return await initDatabase();
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}

// Helper function to execute queries
export async function execQuery<T = any>(
  query: string,
  params: any[] = []
): Promise<T[]> {
  const database = await getDatabase();
  const result = await database.getAllAsync<T>(query, params);
  return result;
}

export async function execRun(
  query: string,
  params: any[] = []
): Promise<SQLite.SQLiteRunResult> {
  const database = await getDatabase();
  return await database.runAsync(query, params);
}
