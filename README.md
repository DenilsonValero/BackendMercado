# Backend Mercado

API para un mercado de ítems con inventario, publicaciones, compras atómicas y eventos Socket.IO.

## Inicio local

1. Copiá `.env.example` como `.env` y completá las credenciales (incluido `JWT_SECRET`).
2. Creá una base MySQL 8 vacía y aplicá `db/migrations/001_initial_schema.sql`.
3. Ejecutá `npm install`, después `npm run dev`.
4. Para el catálogo de ejemplo, ejecutá `node src/utils/seeder.js`.

`JWT_SECRET` debe ser aleatorio y tener 32 caracteres o más. En producción también es obligatorio configurar `CORS_ORIGIN` con los orígenes exactos del frontend.

## Endpoints principales

| Método | Ruta | Uso |
| --- | --- | --- |
| POST | `/api/auth/register` | Crear cuenta |
| POST | `/api/auth/login` | Obtener JWT |
| GET | `/api/auth/profile` | Perfil privado |
| GET | `/api/auth/profile/:id` | Perfil público |
| GET | `/api/inventory` | Inventario propio |
| GET | `/api/market?page=1&limit=20` | Publicaciones activas |
| POST | `/api/market/sell` | Crear publicación |
| POST | `/api/market/buy/:listingId` | Comprar publicación |
| DELETE | `/api/market/:listingId` | Cancelar publicación propia |
| GET | `/api/market/history` | Historial propio |

Las rutas `/api/inventory/claim-test` y `/api/wallet/add-balance` son exclusivamente de desarrollo/test y responden `403` en producción. No son mecanismos de cobro reales.

## Recargas con Mercado Pago

La recarga real usa Checkout Pro: las tarjetas argentinas se cargan en la pagina segura de Mercado Pago. Con un JWT, crear una preferencia con `POST /api/wallet/topups` y `{ "amount": 1000 }`; el frontend debe redirigir al usuario a `checkoutUrl` (o a `sandboxCheckoutUrl` con credenciales de prueba). El saldo se acredita solamente cuando el webhook valida un pago `approved`.

Aplicar `db/migrations/002_wallet_topups.sql`, configurar las variables `MP_*` de `.env.example` y registrar el evento **Payments** en el panel de Mercado Pago. Para probar en local, ejecutar `ngrok start mercado-api --config ngrok.yml`, copiar la URL HTTPS resultante en `MP_WEBHOOK_URL` agregando `/api/webhooks/mercadopago`, reiniciar la API y configurar esa misma URL como webhook de prueba en Mercado Pago.

## Reglas de integridad

- El precio y los saldos usan `DECIMAL(12,2)`.
- Sólo puede haber una publicación activa por ítem de inventario.
- La compra bloquea publicación y ambos saldos dentro de una única transacción.
- El libro `wallet_ledger` conserva créditos de prueba, débitos de compra y créditos de venta.

Antes de integrar pagos reales, reemplazá el crédito de prueba por un proveedor de pagos con webhooks firmados e idempotencia.
