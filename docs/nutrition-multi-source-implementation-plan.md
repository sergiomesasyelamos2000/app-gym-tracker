# Plan De Implementacion Por Fases: Catalogo Nutricional Multi-Fuente

## 1. Objetivo
Construir un catalogo de productos/alimentos mas completo y rapido combinando multiples fuentes (Open Food Facts, USDA y proveedores con restricciones), evitando duplicados y manteniendo cumplimiento legal/licencias.

---

## 2. Alcance Y Principios

- Priorizar busqueda rapida y estable en la app.
- Separar claramente:
  - Datos persistentes permitidos por licencia.
  - Datos de proveedores con restricciones de retencion.
- Usar identificadores canonicos internos para dedupe y trazabilidad.
- Diseñar para crecimiento (mas fuentes sin romper el modelo).

---

## 3. Fuentes Y Politica De Uso

## 3.1 Persistencia larga (base principal)
- Open Food Facts (con atribucion y obligaciones ODbL).
- USDA FoodData Central (CC0, ideal para alimentos genericos).

## 3.2 Overlay runtime (cache corto)
- FatSecret, Nutritionix, Edamam, Chomp.
- Guardar solo cache temporal segun TOS, no consolidar permanentemente en `products_master` si la licencia no lo permite.

---

## 4. Arquitectura Propuesta

## 4.1 Componentes
- `ingestion-jobs` (Nest cron/queue): conectores por fuente.
- `normalizer`: mapea cada fuente a esquema comun.
- `deduper`: decide merge/create con reglas deterministas + fuzzy.
- `catalog-api`: endpoints de busqueda/scan/detalle.
- `search-index`: PostgreSQL (`pg_trgm`) o Meilisearch/Elastic.

## 4.2 Flujo
1. Ingesta por conector.
2. Normalizacion a formato comun.
3. Dedupe contra catalogo canonico.
4. Upsert + registro de procedencia.
5. Reindex.
6. Exposicion por API.

---

## 5. Modelo De Datos (Propuesto)

## 5.1 Tablas principales
- `products_master`
  - `id` (uuid)
  - `canonical_name`
  - `canonical_brand`
  - `barcode_gtin` (nullable, index unique parcial)
  - `serving_size`
  - `image_url`
  - `quality_score`
  - `created_at`, `updated_at`

- `product_nutrients_per_100g`
  - `product_id` (fk)
  - `calories`, `protein`, `carbs`, `fat`
  - `fiber`, `sugar`, `sodium`, `saturated_fat`
  - `raw_json`

- `product_sources`
  - `id`
  - `product_id` (fk)
  - `source` (`off`, `usda`, `fatsecret`, `nutritionix`, `edamam`, `chomp`)
  - `source_product_id`
  - `license_tag`
  - `last_seen_at`
  - `payload_hash`
  - `raw_payload` (opcional, segun TOS)
  - Index unique: (`source`, `source_product_id`)

- `product_aliases`
  - `product_id`
  - `alias_name`
  - `language`

- `product_merge_audit`
  - `id`
  - `candidate_key`
  - `decision` (`merged`, `created`, `rejected`)
  - `reason`
  - `score`
  - `created_at`

## 5.2 Tablas de cache temporal (fuentes restringidas)
- `provider_cache_short_lived`
  - `provider`
  - `cache_key`
  - `response_json`
  - `expires_at`
  - Politica TTL estricta.

---

## 6. Reglas De Normalizacion

- Convertir nombres a lowercase + sin acentos + trim + espacios unificados.
- Normalizar marcas (quitar sufijos legales frecuentes: `s.l.`, `inc`, etc).
- Normalizar unidades:
  - Priorizar nutrientes por 100g/100ml.
  - Si solo hay por porcion, convertir cuando exista `serving_size`.
- Normalizar codigos de barras:
  - Mantener como string.
  - Validar formato EAN/UPC.

---

## 7. Reglas De Dedupe

## 7.1 Jerarquia de matching
1. Match exacto por `barcode_gtin`.
2. Match exacto por (`brand_norm`, `name_norm`, `serving_size_norm`).
3. Match fuzzy por trigram (`name_norm`) + brand similar + nutrientes cercanos.

## 7.2 Scoring sugerido (0-100)
- Barcode exacto: +80
- Nombre similar > 0.9: +25
- Marca similar > 0.9: +20
- Nutrientes cercanos (delta bajo): +15
- Penalizacion por conflicto fuerte en macros: -30
- Umbral merge automatico: >= 85
- Rango 70-84: cola de revision manual (o auto si no hay conflicto nutricional).

---

## 8. Fases De Implementacion

## Fase 0: Preparacion (1-2 dias)
Objetivo: dejar base tecnica y legal definida.
- Crear documento de cumplimiento/licencias por fuente.
- Definir feature flags:
  - `NUTRITION_MULTI_SOURCE_ENABLED`
  - `NUTRITION_PROVIDER_OVERLAY_ENABLED`
- Crear metricas base actuales (latencia y cobertura) para comparar.

Entregables:
- Documento compliance.
- Baseline de KPIs.

## Fase 1: Modelo de datos + OFF optimizado (3-5 dias)
Objetivo: consolidar OFF bien indexado y dedupe por barcode.
- Crear migraciones de tablas nuevas.
- Implementar normalizador OFF.
- Implementar dedupe v1 (barcode exact + key exacta basica).
- Integrar cache en memoria/Redis para busquedas (`q:page:pageSize`).
- Indexar Postgres (`pg_trgm`) para `name`.

Entregables:
- Ingesta OFF funcional.
- Busqueda local primaria usando DB propia.

Aceptacion:
- p95 busqueda < 300ms (catalogo local).
- Duplicados por barcode ~ 0.

## Fase 2: USDA para alimentos genericos (2-4 dias)
Objetivo: mejorar cobertura de alimentos no comerciales.
- Implementar conector USDA.
- Normalizar nutrientes y unidades a esquema comun.
- Dedupe v2 (nombre+marca+serving + similitud nutrientes).

Entregables:
- Incremento de cobertura en alimentos genericos.

Aceptacion:
- +X% productos encontrados para queries de genericos.

## Fase 3: Overlay proveedores restringidos (3-5 dias)
Objetivo: aumentar recall sin comprometer licencias.
- Integrar FatSecret/Nutritionix/Edamam/Chomp como fuentes runtime.
- Guardar solo cache corta en tabla temporal.
- Fallback chain:
  1. Catalogo local
  2. Provider overlay
  3. Respuesta combinada dedupeada en memoria

Entregables:
- Mayor recall en marcas no cubiertas localmente.

Aceptacion:
- +X% recall en benchmark de busquedas.
- Cumplimiento TOS verificado.

## Fase 4: Relevancia y ranking (2-3 dias)
Objetivo: mejores resultados top-10.
- Ranking hibrido:
  - exact/prefix > contains > fuzzy.
  - score de calidad nutricional de fuente.
  - popularidad local (click/add-to-diary).
- Logging de `search -> click`.

Entregables:
- Ranking ajustado a uso real.

Aceptacion:
- Mejora CTR top-5.

## Fase 5: Operacion y observabilidad (2 dias)
Objetivo: estabilidad operativa.
- Dashboards:
  - latencia p50/p95/p99
  - cache hit rate
  - tasa de dedupe
  - errores por proveedor
- Alertas:
  - timeout proveedor > umbral
  - caida de cobertura

Entregables:
- Monitoreo y alertas productivas.

---

## 9. Endpoints Recomendados

- `GET /nutrition/products/search?q=&page=&pageSize=`
  - Busca en catalogo local.
  - Opcional `overlay=true` para enriquecer en tiempo real.

- `POST /nutrition/products/ingest/off`
- `POST /nutrition/products/ingest/usda`
- `POST /nutrition/products/reindex`
- `GET /nutrition/products/metrics/search`

---

## 10. Indices SQL Recomendados (PostgreSQL)

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_products_master_name_trgm
ON products_master USING gin (canonical_name gin_trgm_ops);

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_master_barcode_unique
ON products_master (barcode_gtin)
WHERE barcode_gtin IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_sources_unique
ON product_sources (source, source_product_id);
```

---

## 11. Riesgos Y Mitigaciones

- Riesgo: conflictos de licencia al mezclar fuentes.
  - Mitigacion: separar persistencia/overlay por politica de datos.

- Riesgo: dedupe agresivo une productos distintos.
  - Mitigacion: umbral alto + audit trail + revision de casos borderline.

- Riesgo: latencia de proveedores externos.
  - Mitigacion: timeout corto, retry acotado, cache y fallback local.

---

## 12. Checklist De Arranque (Sprint 1)

- [ ] Crear migraciones de `products_master`, `product_nutrients_per_100g`, `product_sources`, `product_merge_audit`.
- [ ] Implementar normalizador OFF.
- [ ] Implementar dedupe v1 (barcode + exact key).
- [ ] Activar indices `pg_trgm`.
- [ ] Mover `searchProductsByName` a consulta local primaria.
- [ ] Añadir metricas de latencia y cache-hit.

---

## 13. KPI Objetivo

- Latencia busqueda local p95: < 300 ms.
- Cache hit rate: > 60%.
- Duplicados detectados por barcode: < 0.5%.
- Recall top-10 en benchmark interno: +20% vs baseline.

