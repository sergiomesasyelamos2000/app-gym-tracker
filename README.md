# app-gym-tracker

App móvil construida con Expo/React Native (EvoFit).

## Publicar iOS y probar en TestFlight

### 1. Requisitos previos

1. Tener acceso al equipo de Apple Developer y al proyecto en App Store Connect.
2. Tener EAS CLI instalado:

```bash
npm install -g eas-cli
```

3. Iniciar sesión en Expo:

```bash
eas login
```

4. Verificar el identificador iOS configurado en el proyecto:
   - `com.smy862.app` (en `app.json`).

### 2. Variables/secrets necesarias

Este proyecto usa un paquete privado y Google OAuth. Antes de build remoto, configura:

1. `NODE_AUTH_TOKEN` en EAS (token con acceso a `read:packages` en GitHub Packages):

```bash
eas secret:create --scope project --name NODE_AUTH_TOKEN --value <TU_TOKEN>
```

2. Google Client IDs (`EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS`, `EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB`) ya están definidos en `eas.json` para los perfiles.

### 3. Generar build de producción para iOS

```bash
eas build -p ios --profile production
```

Cuando termine, EAS mostrará la URL del build.

### 4. Enviar build a TestFlight

Opción A (recomendada): envío automático con EAS Submit

```bash
eas submit -p ios --profile production
```

Opción B: subir manualmente el `.ipa` desde Transporter.

### 5. Habilitar testers en App Store Connect

1. Ir a App Store Connect -> My Apps -> EvoFit -> TestFlight.
2. Esperar a que Apple procese el build.
3. Añadir testers internos o externos.
4. Para testers externos, completar la información requerida y enviar a revisión beta.

### 6. Instalar y usar en iPhone con TestFlight

1. Instalar TestFlight desde App Store.
2. Aceptar invitación (email o enlace público).
3. Instalar el build de EvoFit desde TestFlight.
4. Abrir la app y validar login/funcionalidades en entorno real.

## Live Activity del entreno (estilo Hevy)

Durante un entreno activo, EvoFit muestra un widget en vivo:

| Plataforma | Qué verás |
|---|---|
| **Android** | Notificación sticky (Foreground Service): duración del entreno, ejercicio, siguiente serie, descanso (−15 / +15 / Omitir) y “Completar serie” |
| **iOS** | Live Activity en Lock Screen / Dynamic Island (ActivityKit), con la misma función |

No funciona en **Expo Go**. Hace falta un **build nativo EAS** (dev client, preview o production).

Código relevante:

- JS: `src/services/workoutLiveService.ts`
- Android FGS: `android/.../WorkoutLiveForegroundService.kt`
- iOS bridge + widget sources: `ios/EvoFit/WorkoutLive/`, `ios/WorkoutLiveActivity/`
- Plugin: `plugins/withWorkoutLiveActivity.js` (App Group, flags Live Activities, metadata EAS de la extensión)

### Configurar Apple Developer (sin Mac)

Hazlo una vez en [developer.apple.com/account](https://developer.apple.com/account) → **Certificates, Identifiers & Profiles** → **Identifiers**.

#### A) Crear el App Group

1. En Identifiers, cambia el filtro de **App IDs** a **App Groups**.
2. Pulsa **+**.
3. Description: `EvoFit App Group` (o similar).
4. Identifier: `group.com.smy862.app` (exacto).
5. **Continue** → **Register**.

Si ya existe, no lo crees otra vez.

#### B) App ID principal `com.smy862.app`

1. Filtro **App IDs** → abre `com.smy862.app`.
2. Activa **App Groups**.
3. **Configure** → marca `group.com.smy862.app`.
4. **Save** / **Confirm**.

#### C) App ID de la extensión `com.smy862.app.WorkoutLiveActivity`

1. Identifiers → **App IDs** → **+**.
2. Tipo: **App** → **Continue**.
3. Description: `EvoFit Workout Live Activity`.
4. Bundle ID: **Explicit** → `com.smy862.app.WorkoutLiveActivity`.
5. Activa **App Groups**.
6. **Continue** → **Register**.
7. Abre el App ID → **App Groups** → **Configure** → marca `group.com.smy862.app`.
8. **Save** / **Confirm**.

Comprobación:

| Tipo | Identifier |
|---|---|
| App Group | `group.com.smy862.app` |
| App ID | `com.smy862.app` (App Groups ✓) |
| App ID | `com.smy862.app.WorkoutLiveActivity` (App Groups ✓) |

#### D) Credenciales EAS

Tras crear/actualizar los identifiers:

```bash
eas credentials -p ios
```

Regenera los **Provisioning Profiles** de la app y de la extensión, o deja que el próximo build los cree:

```bash
eas build -p ios --profile development
# o
eas build -p ios --profile preview
# o
eas build -p ios --profile production
```

El plugin declara la extensión en `extra.eas.build.experimental.ios.appExtensions` para que EAS sepa firmarla ([docs](https://docs.expo.dev/build-reference/app-extensions)).

### Probar en dispositivo

#### Android

1. Instala un build EAS (`development` / `preview` / `production`), no Expo Go.
2. Concede permiso de notificaciones si el sistema lo pide.
3. Inicia una rutina → debe aparecer la notificación sticky “EvoFit · Entreno”.
4. Sal de la app (home) → la notificación sigue visible con el cronómetro.
5. Prueba **Completar serie**, −15 / +15 / **Omitir** durante el descanso.
6. Al guardar o descartar el entreno, la notificación desaparece.

#### iOS

1. Instala un build EAS en un iPhone físico (iOS 16.2+).
2. Ajustes → Face ID y código → activar **Live Activities**.
3. Ajustes → Notificaciones → EvoFit → activar las que necesites.
4. Inicia una rutina → debería aparecer el Live Activity en pantalla de bloqueo / Dynamic Island.
5. Prueba completar serie y los controles de descanso desde el widget.
6. Al acabar el descanso, la notificación local “Descanso Completado” (si el toggle de Perfil está activo).

**Nota:** si en iOS el Lock Screen no muestra el widget pero el build es correcto, suele ser App Group / provisioning de la extensión, o que el **Widget Extension target** no esté embebido en el proyecto nativo que compila EAS. La metadata de `appExtensions` cubre firmas; el target del widget debe existir en el proyecto Xcode generado/commiteado.

### Identifiers de referencia

| Recurso | Valor |
|---|---|
| Bundle app | `com.smy862.app` |
| Bundle Live Activity | `com.smy862.app.WorkoutLiveActivity` |
| App Group | `group.com.smy862.app` |

## Comandos útiles

```bash
# build iOS de desarrollo interno
eas build -p ios --profile development

# build iOS preview interno
eas build -p ios --profile preview

# build Android (APK interno)
eas build -p android --profile development

# ver builds recientes
eas build:list -p ios
eas build:list -p android
```
