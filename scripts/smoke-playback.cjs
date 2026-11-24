const fs = require("node:fs");
const vm = require("node:vm");

const context = { window: {} };
vm.runInNewContext(fs.readFileSync("supabase-config.js", "utf8"), context);
const config = context.window.NEXORA_SUPABASE_CONFIG || {};
const base = String(config.url || "").replace(/\/$/, "");
const key = String(config.publishableKey || "");
if (!base.startsWith("https://") || !key) {
  throw new Error("NEXORA Supabase public configuration is missing.");
}

(async () => {
  const response = await fetch(base + "/functions/v1/nx-playback-url", {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({})
  });
  const result = await response.json().catch(() => ({}));
  if (response.status !== 400 || result.error !== "invalid_episode") {
    throw new Error("Playback signer smoke test failed: HTTP " + response.status + " " + JSON.stringify(result));
  }
  console.log("PASS live NEXORA playback signer is reachable and validates requests.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
