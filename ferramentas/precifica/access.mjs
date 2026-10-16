const DEFAULT_API_BASE = "https://ever-tools-automation-staging.gabrielfelipegfrs.workers.dev";
const STORAGE_KEY = "ever_precifica_access_v1";

function apiBase() {
  return String(window.EVER_PRECIFICA_API_BASE || DEFAULT_API_BASE).replace(/\/$/, "");
}

function readStoredToken() {
  try { return localStorage.getItem(STORAGE_KEY) || ""; } catch (_) { return ""; }
}

function storeToken(token) {
  try { localStorage.setItem(STORAGE_KEY, token); } catch (_) {}
}

export function clearAccessToken() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
}

async function post(path, body, token = "") {
  const headers = { "content-type": "application/json" };
  if (token) headers.authorization = "Bearer " + token;

  const response = await fetch(apiBase() + path, {
    method: "POST",
    headers,
    body: JSON.stringify(body || {})
  });

  let data = {};
  try { data = await response.json(); } catch (_) {}
  return { response, data };
}

function activationTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return String(params.get("activate") || "").trim();
}

function scrubActivationTokenFromUrl() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("activate")) return;
  url.searchParams.delete("activate");
  window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + url.hash);
}

export async function ensureAccess() {
  const activationToken = activationTokenFromUrl();

  if (activationToken) {
    try {
      const { response, data } = await post("/access/activate", { token: activationToken });
      scrubActivationTokenFromUrl();

      if (response.ok && data?.access_token) {
        storeToken(data.access_token);
        return { valid: true, source: "activation", productCode: data.product_code || null };
      }

      return { valid: false, activationError: true };
    } catch {
      return { valid: false, networkError: true };
    }
  }

  const stored = readStoredToken();
  if (!stored) return { valid: false };

  try {
    const { response, data } = await post("/access/validate", {}, stored);
    if (response.ok && data?.valid) {
      return { valid: true, source: "stored", productCode: data.product_code || null };
    }

    clearAccessToken();
    return { valid: false, expired: true };
  } catch {
    return { valid: false, networkError: true };
  }
}

export async function requestRecovery(email) {
  try {
    const { response, data } = await post("/access/recover", { email });
    if (response.ok) {
      return {
        ok: true,
        message: data?.message || "Se encontrarmos uma compra válida para este e-mail, você receberá um novo link de acesso."
      };
    }
    return { ok: false, message: "Não foi possível solicitar o link agora. Tente novamente em alguns minutos." };
  } catch {
    return { ok: false, message: "Não foi possível conectar ao serviço de acesso. Tente novamente em alguns minutos." };
  }
}
