# Texto para actualizar la Política de Privacidad (EvoFit)

**URL:** https://evofitofficial.lovable.app/privacy  
**Sustituye o amplía las secciones 5, 6, 7 y 8** con el contenido siguiente.  
**Actualiza también** la fecha «Última actualización» al día en que publiques.

Alineado con la app móvil (HealthKit / Health Connect, cámara, IA, App Store App Privacy) a **octubre de 2026**.

---

## 5. Permisos del dispositivo

EvoFit solicita solo los permisos necesarios para las funciones que uses. Puedes revocarlos en Ajustes del dispositivo; algunas funciones dejarán de estar disponibles.

| Permiso | Obligatorio | Para qué |
|--------|-------------|----------|
| **Internet** | Sí | Sincronizar cuenta, rutinas, nutrición y suscripción con nuestros servidores. |
| **Cámara** | No | Escanear códigos de barras de alimentos y fotografiar comidas para estimar macros (si eliges esa opción). |
| **Fototeca** | No | Elegir foto de perfil o imágenes de comida desde tu galería. |
| **Notificaciones** | No | Recordatorios opcionales (por ejemplo, temporizador de descanso entre series). |
| **Apple Salud (HealthKit)** — solo iOS | No | Si pulsas **Conectar Apple Salud**: leer frecuencia cardiaca y energía activa durante el entrenamiento; leer sueño y pasos para consejos de descanso en Perfil; y, si lo activas, escribir el entrenamiento completado y las calorías activas de la sesión. |
| **Health Connect** — solo Android | No | Mismas finalidades que Apple Salud cuando conectas Health Connect. |

**No solicitamos acceso al micrófono.** La cámara se usa para foto y escaneo de códigos, no para grabar audio.

**Relojes y bandas:** EvoFit **no empareja** dispositivos por Bluetooth. Apple Watch, Fitbit, Garmin y marcas similares suelen sincronizar con **Apple Salud** o **Health Connect**; EvoFit lee (y opcionalmente escribe entrenos) a través de esos hubs cuando tú lo autorizas.

---

## 6. Servicios de terceros (encargados del tratamiento)

Trabajamos con proveedores que procesan datos en nuestro nombre, bajo contrato y medidas de seguridad adecuadas:

| Proveedor | Finalidad | Datos implicados (resumen) |
|-----------|-----------|----------------------------|
| **Infraestructura de backend (API EvoFit)** | Alojar la API, base de datos y autenticación de la app en producción. | Cuenta, rutinas, nutrición, suscripción, métricas de entreno guardadas en tu cuenta. |
| **Google Sign-In / Sign in with Apple** | Inicio de sesión. | Identificadores y datos de perfil básicos que el proveedor comparte con EvoFit según tu elección. |
| **Apple (App Store / StoreKit)** | Compras y gestión de suscripción Premium en iOS. | Identificadores de transacción y estado de suscripción; Apple procesa el pago. |
| **Google (Gemini)** | Análisis de fotos de comida y, junto con otros modelos, generación de planes nutricionales y chat de nutrición/entrenamiento. | Imagen de comida (cuando la subes); texto del chat; contexto resumido de perfil (ver sección 8). |
| **Groq** | Procesamiento de chat y planes nutricionales (modelos de lenguaje). | Texto del chat y contexto resumido de perfil (ver sección 8). |
| **Open Food Facts** (consulta pública) | Búsqueda de productos por código de barras o nombre. | Consultas de búsqueda; no enviamos tu identidad de cuenta a Open Food Facts en las consultas estándar de catálogo. |
| **Cloudinary** (u otro CDN de imágenes configurado) | Almacenar y servir imágenes de ejercicios y contenido estático de la app. | URLs e imágenes de catálogo; fotos de perfil o personalizadas que subas según la función. |

No vendemos ni alquilamos tus datos personales. No usamos tus datos de salud de Apple Salud / Health Connect para publicidad ni para «seguimiento» entre apps (tracking).

---

## 7. Datos de salud, fitness y Apple Salud / Health Connect

EvoFit **no es una aplicación médica**. No diagnostica, trata ni sustituye el consejo de un profesional sanitario. Las recomendaciones son deportivas y educativas.

### 7.1. Datos que introduces tú

Edad, sexo, peso, altura, objetivos, rutinas, series, repeticiones, cargas, diario nutricional y perfil de macros se guardan en tu cuenta en nuestros servidores para prestarte el servicio.

### 7.2. Datos leídos desde Apple Salud o Health Connect (con tu permiso)

Solo si conectas el hub y aceptas los permisos del sistema:

| Dato | Uso en la app | ¿Se envía a nuestros servidores? |
|------|----------------|----------------------------------|
| **Frecuencia cardiaca** (durante entreno) | Mostrar BPM en vivo y promedios/máximos de la sesión. | **Sí**, al guardar la sesión: promedio y máximo de FC asociados a ese entreno, vinculados a tu cuenta. |
| **Energía activa / calorías activas** (durante entreno) | Mostrar calorías en la sesión; si no hay dato del hub, puede usarse una estimación interna (MET). | **Sí**, al guardar la sesión: calorías de la sesión e indicador de si provienen del hub o de estimación. |
| **Sueño** (análisis reciente) | Consejos de descanso opcionales en Perfil. | **No** — se consulta en el dispositivo y no se sube como historial de sueño. |
| **Pasos** (ventana reciente) | Consejos de descanso opcionales en Perfil. | **No** — se consulta en el dispositivo y no se sube como historial de pasos. |

### 7.3. Datos que EvoFit puede escribir en Apple Salud / Health Connect

Solo si activas **Guardar entrenos en Apple Salud / Health Connect** y tienes permiso de escritura:

- Sesión de entrenamiento de fuerza completada (tipo de actividad coherente con musculación).
- Calorías activas de esa sesión, cuando están disponibles.

### 7.4. Relación con App Store (App Privacy)

En la ficha de privacidad de Apple declaramos **Salud** y **Fitness** vinculados a tu identidad, con finalidad **funcionalidad de la app**, sin uso para tracking. **No declaramos micrófono.** Sueño y pasos no se tratan como «datos recopilados» enviados al servidor en esa etiqueta, porque permanecen en el dispositivo salvo lo indicado arriba para FC y calorías de sesión.

Puedes desconectar Apple Salud / Health Connect en Ajustes del sistema o dejar de usar la función **Conectar** en Perfil. Eliminar tu cuenta EvoFit borra tus datos en nuestros servidores según la sección 9; **no cancela** por sí sola una suscripción de App Store (debes gestionarla en Ajustes de Apple).

---

## 8. Uso de inteligencia artificial

EvoFit usa modelos de IA para chat de nutrición/entrenamiento, análisis de fotos de comida y generación de planes nutricionales. Te informamos en la app cuando interactúas con estas funciones (incluido el aviso en **Privacidad y datos** del perfil).

### 8.1. Qué puede enviarse a proveedores de IA (Google Gemini, Groq)

- **Chat:** tu mensaje, historial reciente de la conversación y un **contexto resumido** (edad, peso, altura, nivel de actividad, objetivos de calorías y macros, resumen de rutinas, número/fechas de sesiones recientes, identificador interno de usuario).
- **Foto de comida:** la imagen que subes y metadatos técnicos mínimos (p. ej. tipo de archivo).
- **Plan nutricional:** objetivos de calorías/macros, preferencias, restricciones, nivel de actividad, frecuencia de entrenamiento e identificador interno de usuario.

### 8.2. Qué no enviamos a la IA

- Contraseña, tokens de sesión ni datos de pago.
- **Nombre y email** no se incluyen de forma sistemática en las peticiones de IA; pueden aparecer solo si **tú** los escribes en un mensaje o en una imagen.
- **Datos leídos de Apple Salud / Health Connect** (frecuencia cardiaca en tiempo real, sueño, pasos) **no** se envían a Gemini ni Groq para chat o planes.

No utilizamos tus datos personales para entrenar modelos públicos de terceros sin un consentimiento explícito aparte. Puedes dejar de usar el chat y las funciones de IA en cualquier momento.

---

## Notas para quien edite la web

1. **Sección 3 (Datos que recopilamos):** añade una viñeta explícita: *«Métricas de entrenamiento desde el hub de salud (frecuencia cardiaca y calorías de sesión cuando conectas Apple Salud / Health Connect)»*.
2. **Elimina** cualquier mención a **micrófono** o **RECORD_AUDIO** en permisos.
3. **Revisa** la sección 6 antigua (Supabase, Brevo, Google Drive beta) y sustitúyela por la tabla de la sección 6 de arriba, o fusiona conservando solo proveedores que sigan activos.
4. Tras publicar, verifica que el enlace en la app (`PRIVACY_POLICY_URL`) sigue siendo el mismo.

## Checklist App Privacy (App Store Connect) — recordatorio

- **Health:** Sí · Linked · No tracking · App Functionality (FC + calorías activas de sesión).
- **Fitness:** Sí · Linked · No tracking · App Functionality.
- **Microphone:** no declarar.
- Sueño/pasos: no marcar como «collected» si solo se muestran en dispositivo (coherente con este texto).
