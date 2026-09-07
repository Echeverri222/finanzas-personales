# PRD — Patrimonio

**Estado:** borrador para aprobación · **Fuente:** `docs/Patrimonio.md` · **Fecha:** 2026-09-05

---

## 1. Problema y objetivo

Hoy la app responde *"¿en qué se me fue la plata este mes?"* — flujo. No responde *"¿cuánto tengo?"* — stock. El usuario mantiene ese número aparte (hoja de cálculo, memoria) y por eso nunca sabe si un mes bueno de flujo se tradujo en más patrimonio.

**Objetivo:** que el usuario pueda ver su patrimonio neto y su detalle (cuentas, activos, inversiones) dentro de la app, y opcionalmente conectar sus movimientos a las cuentas para que el saldo se mueva solo.

**Principio rector, no negociable:** *Patrimonio no cambia el dashboard.* La sección de flujo actual (`views/dashboard/DashboardView.jsx`, `useDashboardData`) muestra exactamente los mismos números antes y después de esta feature. Lo único que Patrimonio habilita en el flujo es un campo **opcional** de cuenta en el movimiento.

---

## 2. Alcance

### Dentro (in scope)

| # | Capacidad |
|---|---|
| F1 | Activar/desactivar la función Patrimonio por usuario, en cualquier momento |
| F2 | Crear y administrar cuentas de 4 tipos: **ahorros**, **efectivo**, **activo**, **inversión** |
| F3 | Cuenta de ahorros con banco asociado; efectivo sin banco |
| F4 | Activo con valor total y deuda **opcional** (se activa o no por activo) |
| F5 | Cuenta de inversión con dos componentes: efectivo del broker + posiciones en tickers |
| F6 | Posiciones por ticker con precio de compra **por posición** (varios lotes del mismo ticker) |
| F7 | Valoración de posiciones al cierre de mercado (API de Massive), expresada en la moneda del usuario |
| F8 | Asociar un movimiento (gasto/ingreso) a una cuenta, que ajusta su saldo |
| F9 | Snapshot histórico del patrimonio total para ver su evolución |
| F10 | Pantalla de inversiones transversal (todas las cuentas de inversión): posiciones cerradas con rentabilidad realizada, precio promedio por ticker, rentabilidad no realizada |

### Fuera (out of scope, esta versión)

- Sincronización bancaria automática (Plaid/Belvo). Todo es entrada manual.
- Multi-moneda a nivel de usuario: sigue existiendo **una** moneda de presentación (`usuarios.currency`, hoy COP). Los precios en USD se convierten para mostrar.
- Dividendos, splits, comisiones detalladas, impuestos, costo promedio fiscal (FIFO/LIFO). V1 usa lote-a-lote explícito.
- Depreciación automática de activos (el carro no baja solo; el usuario edita el valor).
- Presupuestos, proyecciones o metas atadas a patrimonio.
- Reescritura del dashboard de flujo. (Ver principio rector.)

---

## 3. Usuario y contexto

Un solo perfil: el dueño de la app, usuario avanzado, cuentas en pesos colombianos, con un broker donde tiene efectivo y posiciones en USD (VOO, BTC, etc.). Todo el modelo es **por usuario** con RLS, igual que el resto del esquema.

---

## 4. Modelo conceptual

```
usuario
  └── patrimonio_habilitado (flag)
        └── cuentas ────────────────────┬── movimientos.cuenta_id (opcional)
              ├── ahorros   (banco, saldo)
              ├── efectivo  (saldo)
              ├── activo    (valor_total, deuda opcional)
              └── inversion (saldo en efectivo del broker)
                    └── posiciones (ticker, cantidad, precio compra, abierta/cerrada)
        └── patrimonio_snapshots (fecha, total, desglose)
```

**Patrimonio neto** = Σ saldos (ahorros + efectivo + efectivo de brokers) + Σ valor de mercado de posiciones abiertas + Σ valor de activos − Σ deuda de activos.

### 4.1 Cuentas

Una tabla `cuentas` con discriminador `tipo`, no cuatro tablas. Los cuatro tipos comparten identidad, dueño, nombre, moneda y estado; lo que difiere son 3–4 campos que van nulos con `CHECK` por tipo. Cuatro tablas obligarían a un `UNION` en cada consulta de patrimonio y a cuatro FKs desde `movimientos`.

Campos por tipo:

| Campo | ahorros | efectivo | activo | inversión |
|---|---|---|---|---|
| `banco` | requerido | — | — | opcional (nombre del broker) |
| `saldo` | sí | sí | — | sí (efectivo del broker) |
| `valor_total` | — | — | requerido | — |
| `tiene_deuda` / `valor_deuda` | — | — | opcional | — |
| posiciones | — | — | — | sí |

### 4.2 Saldo: almacenado, no derivado

El saldo de una cuenta líquida se **almacena** y se ajusta transaccionalmente cuando un movimiento se asocia, edita, desasocia o borra. La alternativa (derivarlo siempre como `saldo_inicial + Σ movimientos`) se descarta: el usuario empieza a usar la app con años de movimientos históricos que no tienen cuenta, y recalcular sobre esa base daría un saldo falso.

**Convención de signo (crítica):** en este esquema `movimientos.importe` se guarda **siempre positivo**; el signo lo da `tipo_movimiento.tipo` (ver `hooks/useDashboardData.js`). Por lo tanto el efecto sobre el saldo es:

- `ingreso` → `saldo += importe`
- `gasto`, `ahorro`, `inversion`, `prestamo` → `saldo -= importe`

Se implementa en un **trigger de base de datos** sobre `movimientos`, no en el cliente: una edición desde el SQL editor, un pago recurrente generado por `generar_recurrentes_del_mes`, o un borrado en cascada deben mover el saldo igual que un formulario.

### 4.3 El efectivo de la cuenta de inversión es autónomo

Un movimiento de flujo con `tipo_categoria = 'inversion'` asociado a una cuenta de inversión **suma efectivo a esa cuenta**. Pero es *una* de las formas en que entra efectivo, no la única, y el valor de la cuenta **no se deriva** de los movimientos de tipo inversión.

Esto importa porque la relación es asimétrica y así debe quedar:

- Todo movimiento de tipo inversión asociado a la cuenta sube su efectivo. ✅
- No todo el efectivo de la cuenta vino de un movimiento de tipo inversión. ✅
- Por lo tanto: **`Σ movimientos tipo inversión ≠ valor de la cuenta`**, y la app nunca debe asumir esa igualdad ni "conciliar" una contra otra.

Razones por las que el efectivo de la cuenta puede moverse sin movimiento de flujo: el saldo con el que el usuario arrancó al activar Patrimonio (años de aportes previos a usar la app), venta de una posición, dividendos o intereses del broker, comisiones, retiros, transferencias internas, o un simple ajuste manual porque el broker dice otra cosa.

**Regla:** el saldo de la cuenta de inversión es un dato propio, editable directamente por el usuario. Una vez el efectivo está dentro de la cuenta, el usuario lo distribuye libremente entre efectivo y posiciones mediante **operaciones internas de patrimonio**, que no son movimientos y no tocan el dashboard de flujo:

| Operación interna | Efecto |
|---|---|
| Comprar posición | efectivo −, posición abierta + |
| Vender posición | posición cerrada, efectivo + |
| Ajuste de efectivo | efectivo = valor indicado, con nota |
| Rendimiento / dividendo / comisión | efectivo ± |

Esto generaliza el mismo principio de §4.2: **los saldos se almacenan, no se derivan del flujo.** Vale igual para ahorros y efectivo — el saldo inicial de la cuenta de ahorros tampoco tiene movimientos detrás.

Consecuencia para el dashboard: comprar VOO con efectivo que ya está en el broker **no** genera un gasto ni un movimiento de tipo inversión. Si lo hiciera, cada rebalanceo inflaría los "gastos" del mes con plata que nunca salió del patrimonio.

### 4.4 Posiciones

Una fila = un lote de compra. Comprar VOO tres veces son tres filas; eso es lo que permite conocer la rentabilidad por compra, tal como pide el documento fuente.

- Estado `abierta` / `cerrada`. Cerrar es un `UPDATE` que registra `precio_venta` y `fecha_venta` — **no** se borra la fila; el histórico de rentabilidades realizadas vive ahí.
- Cierre **parcial**: se resuelve dividiendo el lote (se reduce la cantidad de la fila abierta y se crea una fila cerrada con la cantidad vendida y el mismo precio de compra). Sin esto, vender 2 de 5 acciones obliga al usuario a mentir.
- `moneda` por posición (`USD` para VOO/BTC, `COP` para un CDT). La valoración convierte a la moneda del usuario.

### 4.5 Snapshots

Fila diaria (a lo sumo una por día, `unique(usuario_id, fecha)`) con el total y un `desglose jsonb` por tipo de cuenta. Se escribe al cargar la pantalla de Patrimonio, no por cron: sin snapshot no hay gráfico de evolución, y un cron para un usuario único es infraestructura que no se paga sola. Precio de esa decisión, explícito: **días sin abrir la app no tienen punto**; el gráfico interpola.

---

## 5. Datos de mercado — Massive

**Proveedor: Massive** (`https://api.massive.com`, auth `Authorization: Bearer $MASSIVE_API_KEY`, llave ya presente en `.env.local`). Sustituye a FMP para esta feature. La API es compatible en forma con Polygon: mismos paths, mismos prefijos de ticker.

### 5.1 Qué entitlements tiene el plan actual (verificado 2026-09-05)

| Endpoint | Estado | Uso |
|---|---|---|
| `GET /v2/aggs/grouped/locale/us/market/stocks/{fecha}` | ✅ 200 | **12.509** acciones/ETFs en 1 llamada |
| `GET /v2/aggs/grouped/locale/global/market/crypto/{fecha}` | ✅ 200 | **405** criptos en 1 llamada |
| `GET /v2/aggs/grouped/locale/global/market/fx/{fecha}` | ✅ 200 | **1.194** pares FX en 1 llamada |
| `GET /v2/aggs/ticker/{ticker}/prev` | ✅ 200 | Cierre del último día, por ticker |
| `GET /v2/aggs/ticker/{ticker}/range/...` | ✅ 200 | Histórico OHLC |
| `GET /v1/open-close/{ticker}/{fecha}` | ✅ 200 | Cierre de un día puntual |
| `GET /v3/reference/tickers/{ticker}` | ✅ 200 | Validar ticker y obtener nombre |
| `GET /v1/marketstatus/now` | ✅ 200 | Saber si el mercado está abierto |
| `GET /v3/snapshot` (unificado) | ❌ 403 | No entitled |
| `GET /v2/snapshot/...` | ❌ 403 | No entitled |
| `GET /v2/last/trade/{ticker}` | ❌ 403 | No entitled |
| `GET /v1/conversion/{from}/{to}` | ❌ 403 | No entitled |

**Prefijos de ticker:** acciones `VOO` · cripto `X:BTCUSD` · forex `C:USDCOP`.

**Rate limit:** ráfagas cortas devuelven `429` de inmediato (la 2ª llamada seguida ya falla), pero la ventana reabre en **~5 segundos**. No es una cuota diaria escasa; es un límite de concurrencia. Espaciar las llamadas ~1s basta.

### 5.2 Consecuencia de diseño: sincronización diaria, no consulta en vivo

El plan **no incluye precios en tiempo real** (`snapshot` y `last/trade` dan 403). Lo que sí incluye es el cierre diario de mercados completos en una sola llamada. Eso invierte el diseño obvio:

> No se consulta la API cuando el usuario abre la pantalla. Se sincronizan los cierres una vez al día y la app lee de la base de datos.

**Tres llamadas al día cubren cualquier ticker que el usuario pueda llegar a tener** — acciones, cripto y FX, hoy y en el futuro, sin importar cuántas posiciones abra. Comparado con el diseño de una llamada por ticker, esto elimina el rate limit como problema, hace la carga de pantalla instantánea y sin red, y funciona sin conexión.

Y para un patrimonio, el precio de cierre es **el dato correcto**, no una concesión: nadie mide su patrimonio neto al tick.

**Tabla `precios_mercado`** (`ticker`, `fecha`, `cierre`, `moneda`, `fuente`, `actualizado_at`), con `unique(ticker, fecha)`. Es global, no por usuario: el cierre de VOO es el mismo para todos. RLS de solo lectura para usuarios autenticados; solo el job escribe.

**Disparador de la sincronización:** una API route (`pages/api/precios/sync`) protegida, invocada por Vercel Cron una vez al día tras el cierre de mercado, y también manualmente con un botón "Actualizar precios" en `/inversiones`. Se filtra la respuesta *grouped* a los tickers que el usuario realmente tiene, para no guardar 12.509 filas diarias.

**Días sin cierre:** fines de semana y festivos no producen fila para acciones y FX (cripto sí, opera 24/7). La valoración toma **el último cierre disponible ≤ hoy**, y la UI muestra la fecha de ese precio. Un sábado, el patrimonio se valora al viernes, y lo dice.

**Degradación:** si la sincronización falla, la app sigue funcionando con el último precio en base de datos y un aviso con su antigüedad. Nunca queda en blanco por una API caída.

### 5.3 Tasa de cambio USD → COP

Resuelta por el mismo mecanismo: `C:USDCOP` viene en el *grouped* de FX y se guarda en `precios_mercado` como un ticker más. Se muestra siempre la tasa usada y su fecha. Sin tasa disponible, el valor se muestra en USD sin convertir en vez de inventar un número.

### 5.4 Deuda existente que esta feature no arrastra

`hooks/useStockData.js` seguirá usando FMP con `NEXT_PUBLIC_FMP_API_KEY` (llave expuesta en el bundle) para `/stock-analysis`. Patrimonio no la toca ni la extiende: `MASSIVE_API_KEY` es **server-side únicamente**, nunca `NEXT_PUBLIC_*`. Migrar `/stock-analysis` a Massive es un trabajo aparte que esta feature deja preparado, no un requisito de entrega.

## 6. Experiencia de usuario

### 6.1 Activación (F1)

Interruptor en Configuración. Al activarlo por primera vez, se ofrece crear la primera cuenta de inmediato — un patrimonio vacío no dice nada.

**Al desactivarlo no se borra nada.** Se ocultan las pantallas y el selector de cuenta en movimientos; los datos quedan intactos y reaparecen al reactivar. Un interruptor que destruye datos no es un interruptor.

### 6.2 Pantallas nuevas

| Ruta | Contenido |
|---|---|
| `/patrimonio` | Patrimonio neto arriba (`HeroCard`), evolución histórica, lista de cuentas agrupada por tipo con su valor, CTA de crear cuenta |
| `/patrimonio/cuentas/[id]` | Detalle: saldo o valor, movimientos asociados, y si es de inversión, sus posiciones |
| `/inversiones` | Transversal a todas las cuentas de inversión (F10) |

Las tres respetan el layout existente (`components/Layout.js`, `PageHeader`, `Amount`, `StatCard`) y entran en el sidebar bajo un grupo **Patrimonio** — visible solo con el flag activo.

### 6.3 Pantalla de inversiones (F10)

Tres bloques:

1. **Resumen por ticker** (consolidando todas las cuentas): cantidad total, **precio de compra promedio ponderado** de los lotes abiertos, precio actual, valor de mercado, rentabilidad no realizada en monto y %.
2. **Posiciones abiertas**: cada lote con su fecha, precio de compra, precio actual y rentabilidad — porque dos lotes del mismo ticker rinden distinto y ese es el punto de tener lotes.
3. **Historial de cerradas**: precio de compra, precio de venta, rentabilidad realizada en monto y %, período de tenencia.

### 6.4 Movimientos (F8)

Un `Select` opcional de cuenta en `pages/movimientos/nuevo.js` y en la edición. Con el flag apagado, el campo no existe. Con el flag prendido, sigue siendo **opcional**: un movimiento sin cuenta es válido y no toca ningún saldo — todo el histórico está en ese estado y debe seguir siendo válido.

---

## 7. Requisitos no funcionales

- **RLS obligatorio** en toda tabla nueva, con el mismo patrón que `tags` / `pagos_recurrentes`: el usuario solo ve y escribe lo suyo.
- **Migraciones aditivas y reversibles**, con el encabezado documentado y bloque `down` que ya usan las migraciones de este repo (ver `20260815140219_add_currency_to_usuarios.sql`). Riesgo declarado en cada una.
- **Tipos regenerados**: `npm run db:types` tras cada migración; los tipos de dominio se añaden a `types/domain.ts` (ninguna pantalla consume una fila cruda).
- **Datos vía SWR** con `userKey(...)` y las claves scoped por `usuarios.id`, como el resto de los hooks.
- **Precisión monetaria**: `numeric` en Postgres; las cantidades de acciones admiten fracciones (BTC) — `numeric(20,8)`.
- **`MASSIVE_API_KEY` es server-side.** Nunca `NEXT_PUBLIC_*`, nunca en el bundle. Solo la API route de sincronización la lee.
- **Sin regresión de flujo**: `supabase/tests/invariants.sql` gana asertos de que los totales del dashboard no cambian con movimientos asociados a cuentas.

---

## 8. Criterios de aceptación

1. Con Patrimonio apagado, la app se ve y se comporta **idéntica** a hoy — sin rutas nuevas en el sidebar, sin campo de cuenta en movimientos, sin consultas extra.
2. Al prender el flag y crear una cuenta de ahorros con banco, aparece en `/patrimonio` y suma al patrimonio neto.
3. Un activo con deuda activada aporta `valor_total − valor_deuda` al neto; con la deuda desactivada aporta `valor_total`.
4. Registrar un gasto de gasolina asociado a la cuenta de ahorros **reduce** su saldo por el importe, y el total del dashboard **no cambia**.
5. Borrar o editar ese movimiento revierte o ajusta el saldo correctamente.
6. Dos compras de VOO a precios distintos aparecen como dos posiciones; el resumen por ticker muestra el promedio ponderado de ambas.
7. Cerrar una de las dos deja la otra abierta y la cerrada aparece en el historial con su rentabilidad realizada.
8. Con la API de mercado caída o sin sincronizar hoy, `/patrimonio` e `/inversiones` cargan con el último cierre en base de datos y muestran su fecha.
8b. Una cuenta de inversión con saldo en efectivo y **cero** movimientos asociados es un estado válido y suma al patrimonio neto.
8c. Comprar una posición con efectivo ya presente en el broker **no** crea ningún movimiento ni altera ninguna cifra del dashboard.
9. Apagar el flag y volver a prenderlo devuelve todas las cuentas y posiciones intactas.
10. `npm run typecheck` y `npm run db:invariants` pasan.

---

## 9. Fases de entrega

| Fase | Contenido | Valor entregado |
|---|---|---|
| **P0 — Fundación** | Flag, tabla `cuentas`, RLS, CRUD, `/patrimonio` con neto y lista, snapshots | El usuario ya ve su patrimonio (sin inversiones) |
| **P1 — Flujo ↔ cuentas** | `movimientos.cuenta_id`, trigger de saldo, selector en el formulario, detalle de cuenta | Los saldos se mantienen solos |
| **P2 — Inversiones** | `posiciones`, `precios_mercado`, job de sincronización diaria (3 llamadas *grouped*), operaciones internas, `/inversiones`, cierre total y parcial | La parte más pesada, sobre base ya probada |

Cada fase es desplegable por sí sola. P2 no bloquea el valor de P0.

---

## 10. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Signo del saldo invertido en algún `tipo_categoria` | Saldos silenciosamente errados | Trigger en BD con test en `invariants.sql` cubriendo los 5 valores del enum |
| Rate limit de Massive (`429` en la 2ª llamada seguida) | Sincronización a medias | 3 llamadas *grouped* al día espaciadas ~1s; los precios viven en BD, la pantalla nunca llama a la API |
| El plan de Massive cambia de entitlements | Se pierden los *grouped* | El sondeo de §5.1 se convierte en un script re-ejecutable; la degradación de §5.2 ya cubre el caso |
| Tasa USD/COP incorrecta o ausente | Patrimonio inflado o desinflado | Se muestra la tasa usada y su fecha en la UI; sin tasa, valor en USD sin convertir |
| Conciliar el efectivo del broker contra movimientos de tipo inversión | Saldos "corregidos" a un valor falso | §4.3 lo prohíbe explícitamente; test de invariante: una cuenta de inversión con saldo y sin movimientos asociados es un estado válido |
| Deriva del dashboard | Rompe el principio rector | Asertos de invariantes + criterio de aceptación #4 |
| Cierre parcial mal modelado | Historial de rentabilidad inservible | Se resuelve con división de lote desde P2, no se pospone |

---

## 11. Decisiones abiertas

1. **¿Deuda de activo = pasivo simple o crédito con amortización?** V1 asume monto único que el usuario edita. Un crédito con cuota, tasa y saldo decreciente es otra feature.
2. ~~**¿El aporte al broker es un movimiento de flujo o una operación interna?**~~ **Resuelto** — ver §4.3. Es un movimiento de flujo que *aporta* efectivo a la cuenta, pero el valor de la cuenta no se deriva de esos movimientos, y la compra/venta de posiciones es una operación interna que no toca el flujo.
3. ~~**¿Qué proveedor de FX?**~~ **Resuelto** — `C:USDCOP` está entitled en el plan actual de Massive y llega gratis dentro del *grouped* de FX. Ver §5.3.
4. **¿Se sincronizan precios para tickers sin posición abierta?** Propuesta: no. Solo se persiste el cierre de tickers que el usuario tiene o tuvo, para que el historial de posiciones cerradas siga siendo reconstruible.

---

## 12. Qué cambió al implementarlo (2026-09-05)

Tres cosas que este PRD no anticipó y que la implementación corrigió. Se dejan
escritas porque las tres eran suposiciones razonables que resultaron falsas.

**1. Massive devuelve `403` para el día en curso, no un `200` vacío.**
El mensaje es *"Attempted to request today's data before end of day"*. §5.2 daba
por hecho que un día sin datos llegaba como respuesta vacía y que bastaba con
retroceder; pero la excepción abortaba el bucle de retroceso, así que la
sincronización **no traía ni un solo precio**. Ahora se distingue ese 403 del
403 de entitlement: el primero significa "mira el día anterior", el segundo
significa "tu plan no lo incluye". Sin la distinción, un fallo de plan quedaría
enmascarado como un fin de semana.

**2. El valor de una cuenta se devuelve en la moneda de presentación.**
La primera versión lo devolvía en la moneda de la cuenta. Cada número era
correcto por separado, pero la pantalla ponía un broker de 12.564 USD como
"$ 12.591" —pesos— justo al lado de un total que sí estaba convertido. La regla
que faltaba: **si dos números se muestran juntos, tienen que estar en la misma
moneda.** Hay un caso en `scripts/test-patrimonio.mjs` que verifica que la suma
de las filas es exactamente el total.

**3. La fecha de valoración es la del cierre más ANTIGUO, no el más reciente.**
Las clases se sincronizan por separado y no cierran el mismo día: cripto opera
24/7, las acciones no. Anunciar la más reciente diría que todo está valorado a
hoy cuando la mitad viene de ayer, y el error caería siempre del lado optimista
— el peor lado para un número de patrimonio.

### Añadidos que el PRD no pedía

- `operaciones_cuenta` y la RPC `ajustar_saldo_cuenta`: sin ellas, un ajuste
  manual de efectivo dejaba el saldo movido sin explicación (§4.3 lo exigía de
  hecho, aunque no lo nombrara).
- `eliminar_posicion`: borrar un lote capturado por error no es vender, y no
  debe entrar al historial de rentabilidades.
- `npm run test:patrimonio`: el repo no tiene runner de tests y esta aritmética
  falla en silencio. 21 aserciones, ejecutables con `node`.
