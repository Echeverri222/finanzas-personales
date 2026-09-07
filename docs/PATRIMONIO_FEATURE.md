# Patrimonio

Cuentas, activos e inversiones. Responde *"¿cuánto tengo?"*, que es la pregunta
que el dashboard de flujo —*"¿en qué se me fue la plata?"*— nunca respondió.

Opcional: se activa por usuario en **Ajustes**. Con el interruptor apagado la
app se ve y se comporta exactamente igual que antes.

## 1. Qué crear en la base de datos

Tres migraciones, en orden:

| Migración | Qué añade |
|---|---|
| `..._patrimonio_cuentas.sql` (M20) | `usuarios.patrimonio_habilitado`, `cuentas`, `patrimonio_snapshots` |
| `..._patrimonio_movimiento_cuenta.sql` (M21) | `movimientos.cuenta_id` y el trigger de saldo |
| `..._patrimonio_inversiones.sql` (M22) | `precios_mercado`, `posiciones`, `operaciones_cuenta` y cuatro RPC |

```bash
npm run db:reset      # local
npm run db:types      # regenera types/supabase.ts
```

## 2. Los cuatro tipos de cuenta

| Tipo | Campos propios |
|---|---|
| **Ahorros** | banco (obligatorio) + saldo |
| **Efectivo** | saldo |
| **Activo** | valor total + deuda **opcional** (se activa o no) |
| **Inversión** | broker + efectivo sin invertir + posiciones |

Los `CHECK` de M20 impiden que un tipo lleve campos de otro: un activo no puede
tener saldo, una cuenta líquida no puede tener deuda.

**Patrimonio neto** = ahorros + efectivo + efectivo de brokers + valor de
mercado de las posiciones abiertas + valor de los activos − deuda de los
activos.

## 3. La regla que más sorprende

> **El efectivo de una cuenta es autónomo. `Σ movimientos ≠ valor de la cuenta`.**

Un movimiento de tipo `inversion` asociado al broker le *suma* efectivo, pero es
una de las formas en que entra, no la única: también entra por el saldo con el
que arrancaste, ventas, dividendos, intereses, comisiones y ajustes manuales.
La app **nunca** concilia una cosa contra la otra.

Lo mismo vale para una cuenta de ahorros: su saldo inicial tampoco tiene
movimientos detrás. Por eso el saldo se **almacena**, no se deriva.

Consecuencia: comprar VOO con efectivo que ya está en el broker **no genera
ningún movimiento**. Si lo generara, cada rebalanceo inflaría tus gastos del mes
con plata que nunca salió del patrimonio.

## 4. Movimientos y saldos

Al crear un movimiento puedes elegir una cuenta (opcional siempre). El signo lo
decide la categoría, porque `importe` se guarda siempre positivo:

- `ingreso` → **suma** al saldo
- `gasto`, `ahorro`, `inversion`, `prestamo` → **restan**

Vive en un trigger de base de datos, no en el cliente: los pagos recurrentes se
generan por RPC sin pasar por ningún formulario, y una edición desde el SQL
editor tampoco pasaría por React.

Un movimiento **sin** cuenta es válido y no mueve ningún saldo — todo el
histórico anterior está así.

## 5. Inversiones

**Una fila = un lote de compra.** Tres compras de VOO son tres filas, para poder
ver el rendimiento de cada una. Vender es un `UPDATE`, nunca un `DELETE`: el
historial de rentabilidades realizadas vive en esas mismas filas.

**Cierre parcial**: vender 2 de un lote de 5 divide el lote — quedan 3 abiertas
y nace una fila cerrada de 2 al mismo precio de compra, con `lote_origen_id`
apuntando a la original.

La pantalla `/inversiones` muestra el resumen por ticker (con **promedio
ponderado**: 1 acción a 100 y 9 a 200 dan 190, no 150), los lotes abiertos uno a
uno, y el historial de cerradas.

## 6. Precios de mercado

Proveedor: **Massive** (`https://api.massive.com`, `Authorization: Bearer`).

El plan actual **no incluye precios en tiempo real** (`/v3/snapshot`,
`/v2/last/trade` y `/v1/conversion` responden `403`). Sí incluye
`/v2/aggs/grouped/...`, que devuelve el mercado entero en una llamada: 12.509
acciones, 405 criptos, 1.194 pares FX. El rate limit es de concurrencia —la 2ª
llamada seguida da `429` y la ventana reabre en ~5 s—, no una cuota diaria.

Por eso:

> Los cierres se sincronizan a `precios_mercado` una vez al día. **Las pantallas
> nunca llaman a la API.**

Tres llamadas cubren cualquier ticker que llegues a tener. Para un patrimonio el
cierre diario es el dato correcto, no una concesión: nadie mide su patrimonio
neto al tick.

- Se sincronizan **solo los tickers que tienes o tuviste**, más `C:USDCOP` (la
  tasa para pasar dólares a pesos, que llega gratis en el *grouped* de FX).
- Disparo: botón **Actualizar precios** en `/inversiones`, y un cron diario
  (`vercel.json`) tras el cierre de mercado.
- Fines de semana y festivos no producen cierre para acciones ni FX; se retrocede
  hasta 5 días y la UI muestra a qué fecha está valorado.
- Si la API falla, la app funciona con el último cierre en base de datos y avisa
  de su antigüedad. Nunca queda en blanco.

### Variables de entorno

| Variable | Dónde | Para qué |
|---|---|---|
| `MASSIVE_API_KEY` | **solo servidor** | Llamar a Massive. Nunca `NEXT_PUBLIC_*`. |
| `SUPABASE_SERVICE_ROLE_KEY` | **solo servidor** | Escribir `precios_mercado`, que es global: si cualquier usuario pudiera escribirla, podría envenenar el precio que ven los demás. |
| `CRON_SECRET` | solo servidor, opcional | Autentica la invocación del cron. |

## 7. Verificación

```bash
npm run test:patrimonio    # aritmética pura: promedio ponderado, deuda, rentabilidades
npm run db:invariants -- diff
psql "postgresql://postgres:postgres@127.0.0.1:54422/postgres" \
     -X -q -f supabase/tests/assert_m20_patrimonio.sql
```

Las aserciones de SQL cubren la forma de las cuentas, el signo del saldo en los
**cinco** valores de `tipo_categoria`, y el cierre parcial ejecutando las RPC
reales con una sesión simulada.
