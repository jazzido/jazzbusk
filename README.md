# JazzBusk Payments on Cloudflare Workers

Implementacion de pagos con Mercado Pago para Cloudflare Workers (free tier), con:

- Botones de monto fijo.
- Monto libre ingresado por usuario.
- Creacion de preferencia en server-side (`/api/create-preference`).

## Requisitos

- Cuenta de Cloudflare.
- Cuenta de Mercado Pago con credenciales de produccion.
- Node.js 18+.

## Instalar Wrangler

```bash
npm install -g wrangler
```

## Configuracion local

1. Crea archivo de variables locales:

```bash
cp .dev.vars.example .dev.vars
```

2. Completa al menos:

- `MP_ACCESS_TOKEN`

## Ejecutar en local

```bash
wrangler dev
```

Abre la URL que muestra Wrangler. El frontend y API correran en el mismo dominio local, por eso el cliente usa ruta relativa `/api/create-preference`.

## Deploy

1. Login:

```bash
wrangler login
```

2. Sube secreto de Mercado Pago:

```bash
wrangler secret put MP_ACCESS_TOKEN
```

3. (Opcional) Variables no secretas:

```bash
wrangler deploy --var MP_CURRENCY_ID:ARS
```

4. Publica:

```bash
wrangler deploy
```

## Free tier

Este enfoque funciona en free tier porque usa:

- Un Worker.
- Assets estaticos servidos por Workers Assets.
- Sin base de datos ni servicios pagos.

## Seguridad

- No pongas `MP_ACCESS_TOKEN` en el frontend.
- Valida rangos de monto en el Worker.
- Usa HTTPS (Cloudflare lo provee en produccion).
