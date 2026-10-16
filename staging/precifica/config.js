(function () {
  "use strict";
  window.EVER_PRECIFICA_API_BASE = window.location.origin;
  window.__everestQaMode = "local-test-adapter";
  // Remove activation credentials before deferred consent/analytics can run.
  // The generated access module consumes this value once, in memory only.
  const url = new URL(window.location.href);
  window.__everestQaActivationToken = url.searchParams.get("activate") || "";
  if (url.searchParams.has("activate")) {
    url.searchParams.delete("activate");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
  }
})();
