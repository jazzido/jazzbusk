function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(body, env, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...corsHeaders(env),
    },
  });
}

function buildReturnUrl(baseUrl, status, amount, label) {
  const url = new URL(baseUrl);
  url.searchParams.set("payment", status);
  url.searchParams.set("amount", String(amount));
  url.searchParams.set("label", label);
  return url.toString();
}

function buildMercadoPagoPayload(amount, label, env, requestUrl) {
  const origin = requestUrl.origin;
  const successUrl = buildReturnUrl(
    env.SUCCESS_URL || `${origin}/`,
    "success",
    amount,
    label,
  );
  const failureUrl = buildReturnUrl(
    env.FAILURE_URL || `${origin}/`,
    "failure",
    amount,
    label,
  );
  const pendingUrl = buildReturnUrl(
    env.PENDING_URL || `${origin}/`,
    "pending",
    amount,
    label,
  );

  const payload = {
    items: [
      {
        title: label,
        quantity: 1,
        unit_price: amount,
        currency_id: env.MP_CURRENCY_ID || "ARS",
      },
    ],
    back_urls: {
      success: successUrl,
      failure: failureUrl,
      pending: pendingUrl,
    },
    auto_return: "approved",
    external_reference: crypto.randomUUID(),
  };

  if (env.WEBHOOK_URL) {
    payload.notification_url = env.WEBHOOK_URL;
  }

  return payload;
}

async function createPreference(request, env) {
  if (!env.MP_ACCESS_TOKEN) {
    return jsonResponse(
      {
        error: "Falta configurar MP_ACCESS_TOKEN en las variables secretas del Worker.",
      },
      env,
      500,
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Body JSON invalido." }, env, 400);
  }

  const amount = Number(body?.amount);
  const label = typeof body?.label === "string" && body.label.trim() ? body.label.trim() : "Aporte JazzBusk";

  if (!Number.isFinite(amount) || amount < 100 || amount > 10000000) {
    return jsonResponse({ error: "Monto invalido. Rango permitido: 100 a 10000000." }, env, 400);
  }

  const payload = buildMercadoPagoPayload(amount, label, env, new URL(request.url));

  const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const mpData = await mpResponse.json().catch(() => ({}));

  if (!mpResponse.ok) {
    return jsonResponse(
      {
        error: "Mercado Pago rechazo la creacion de la preferencia.",
        details: mpData,
      },
      env,
      502,
    );
  }

  const checkoutUrl = mpData.init_point || mpData.sandbox_init_point;

  if (!checkoutUrl) {
    return jsonResponse(
      {
        error: "Mercado Pago no devolvio una URL de checkout.",
        details: mpData,
      },
      env,
      502,
    );
  }

  return jsonResponse(
    {
      id: mpData.id,
      checkoutUrl,
    },
    env,
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/create-preference") {
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            Allow: "POST, OPTIONS",
            ...corsHeaders(env),
          },
        });
      }

      if (request.method !== "POST") {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: {
            Allow: "POST, OPTIONS",
          },
        });
      }

      return createPreference(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
