# app-gym-tracker

App móvil construida con Expo/React Native.

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

## Comandos útiles

```bash
# build iOS de desarrollo interno
eas build -p ios --profile development

# build iOS preview interno
eas build -p ios --profile preview

# ver builds recientes
eas build:list -p ios
```
