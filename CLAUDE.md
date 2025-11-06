# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A React Native Expo mobile application for gym workout tracking and nutrition management. The app tracks workout routines, exercises, nutrition intake, macro goals, and provides features like barcode scanning, custom meals, and shopping lists.

## Development Commands

### Running the App
```bash
npm start              # Start Expo dev server with tunnel and clear cache
npm run android        # Run on Android device/emulator
npm run ios           # Run on iOS device/simulator
npm run web           # Run in web browser
```

### Backend Connection
- **Development API**: `http://192.168.1.137:3000/api` (configured in `src/environments/environment.ts`)
- The app expects a backend server running on port 3000
- Update `src/environments/environment.ts` with your local IP address when needed
- The API client includes `ngrok-skip-browser-warning` header for tunneling support

## Architecture

### State Management
The app uses a **hybrid state management approach**:

- **Redux Toolkit** (`src/store/store.ts`): Currently only manages chat state via `chatSlice`
- **Zustand with persistence** (primary): Used for domain-specific state:
  - `useWorkoutInProgressStore.ts`: Tracks active workout sessions (persisted to AsyncStorage)
  - `useNutritionStore.ts`: Manages user nutrition profile, food entries, and macro calculations
  - `useNavigationStore.ts`: Handles tab visibility state

### Feature-Based Structure
```
src/
├── features/              # Feature modules
│   ├── routine/          # Workout & exercise tracking
│   │   ├── screens/      # WorkoutStack, ExerciseDetailScreen, RoutineDetailScreen
│   │   ├── components/   # ExerciseCard, ExerciseList, RoutineHeader, etc.
│   │   ├── services/     # routineService.ts (API calls)
│   │   └── utils/        # routineHelpers.ts
│   ├── nutrition/        # Nutrition tracking & macro management
│   │   ├── screens/      # NutritionStack, MacrosScreen, ProductListScreen, etc.
│   │   └── services/     # nutritionService.ts (comprehensive API)
│   ├── login/            # Authentication
│   ├── chat/             # AI chat integration
│   └── common/           # Shared components (Spinner, ImageModal, ReusableCameraView)
├── navigation/           # BottomTabs navigation setup
├── models/               # TypeScript interfaces and DTOs
├── services/             # Global services (exerciseService.ts)
├── api/                  # API client (apiFetch wrapper)
├── store/                # Redux store and Zustand stores
├── utils/                # Utilities (macroCalculator.ts)
└── screens/              # Root-level screens (HomeScreen, NutritionScreen)
```

### Navigation Structure
- **Bottom Tabs** (`src/navigation/BottomTabs.tsx`): Main navigation with 5 tabs
  - Inicio (Home)
  - Login
  - Entreno (Workout) → WorkoutStack
  - Nutrición → NutritionScreen
  - Macros → NutritionStack
- **Stack Navigators**: WorkoutStack and NutritionStack handle nested navigation within features
- **Tab Visibility**: Controlled by `useNavigationStore` (can hide tabs dynamically)

### API Client Pattern
All API calls go through `apiFetch` (`src/api/client.ts`):
- Handles JSON serialization/deserialization
- Adds common headers including ngrok bypass
- Handles 204 No Content responses correctly
- Type-safe with TypeScript generics

### Service Layer Pattern
Services are organized by feature and expose async functions:
- `routineService.ts`: Routines, sessions, exercises, stats
- `nutritionService.ts`: Products, food diary, user profiles, macros, shopping lists, favorites, custom products/meals
- `exerciseService.ts`: Global exercise operations

## Key Concepts

### Workout Flow
1. **Routine Management**: Users create routines with exercises
2. **Workout Session**: When starting a routine, state is stored in `useWorkoutInProgressStore`
   - Tracks duration, volume, completed sets
   - Persists to AsyncStorage (survives app restarts)
   - Must be explicitly cleared when workout completes
3. **Exercise Cards**: Complex component with sets, rest timers, notes
4. **Session History**: Completed workouts saved via `saveRoutineSession`

### Nutrition Flow
1. **User Profile Setup**: Required before tracking (anthropometrics, goals, activity level)
2. **Food Entry Methods**:
   - Barcode scanning (`expo-barcode-scanner`)
   - Photo analysis (AI-powered)
   - Manual search from OpenFoodFacts API
   - Custom products/meals
3. **Food Diary**: Daily entries categorized by meal type (breakfast, lunch, dinner, snack)
4. **Macro Calculations**: Automatically calculated based on user profile and goals
5. **Units System**: Supports grams, ml, portions, and custom units with conversion

### Data Models
- **DTO Pattern**: Request and Response DTOs separated (e.g., `RoutineRequestDto` vs `RoutineResponseDto`)
- **Comprehensive Nutrition Models**:
  - `Product`: OpenFoodFacts integration
  - `FoodEntry`: Daily food diary entries
  - `UserNutritionProfile`: User data, goals, macro calculations
  - `CustomProduct` & `CustomMeal`: User-created foods
  - `ShoppingListItem` & `FavoriteProduct`: Supporting features

## TypeScript Configuration
- Extends `expo/tsconfig.base`
- Strict mode enabled
- All models have proper type definitions

## Styling
- **NativeWind v4**: Tailwind CSS for React Native
- Configuration in `tailwind.config.js`
- Global styles in `global.css`
- Custom toast component for notifications

## Important Libraries
- **Navigation**: `@react-navigation/native` with bottom-tabs and native-stack
- **UI Components**: `react-native-paper`, `lucide-react-native` (icons)
- **Forms**: `react-hook-form`
- **Camera/Scanner**: `expo-camera`, `expo-barcode-scanner`, `expo-image-picker`
- **Gestures**: `react-native-gesture-handler`, `react-native-reanimated`
- **Storage**: `@react-native-async-storage/async-storage`
- **Calendar**: `react-native-calendars`, `react-native-calendar-strip`
- **Drag & Drop**: `react-native-draggable-flatlist` (for reordering exercises)

## Common Patterns

### Adding a New Feature Screen
1. Create screen in `src/features/{feature}/screens/`
2. Add to appropriate navigator (BottomTabs or feature Stack)
3. Create corresponding service functions in `src/features/{feature}/services/`
4. Define models/interfaces in `src/models/`
5. If state needed, extend existing Zustand store or create new one

### API Integration
1. Define TypeScript interfaces in `src/models/`
2. Create service function using `apiFetch`:
   ```typescript
   export async function fetchData(): Promise<DataType> {
     return await apiFetch<DataType>('endpoint', { method: 'GET' });
   }
   ```
3. Call service from component using async/await with proper error handling

### State Persistence
When creating Zustand stores that need persistence:
```typescript
export const useStore = create<State>()(
  persist(
    (set, get) => ({ /* state and actions */ }),
    {
      name: 'storage-key',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ /* only persist these fields */ }),
    }
  )
);
```

## Environment Configuration
Update `src/environments/environment.ts` when:
- Switching between local development and production
- Changing local IP address
- Using ngrok tunnels
- Separate `ENV.API_URL` (for API endpoints) and `ENV_ASSETS.API_URL` (for static assets)

## Known Patterns
- **Workout in progress persistence**: Workout state survives app kills via AsyncStorage
- **Tab hiding**: Some screens hide bottom tabs using `useNavigationStore.setTabVisibility`
- **Image handling**: Uses `expo-image-picker` and `expo-image-manipulator`
- **Toast notifications**: Custom toast via `react-native-toast-message` with timer/progress support
- **Exercise reordering**: Drag-and-drop via `react-native-draggable-flatlist`
