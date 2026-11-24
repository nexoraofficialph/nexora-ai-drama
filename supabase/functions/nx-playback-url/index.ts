const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

function respond(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return respond({ error: "method_not_allowed" }, 405);

  try {
    const projectUrl = Deno.env.get("SUPABASE_URL") || "";
    let secretKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS") || "";
    if (secretKeysRaw) {
      try {
        const secretKeys = JSON.parse(secretKeysRaw);
        secretKey = secretKeys.default || secretKey;
      } catch {
        return respond({ error: "playback_service_misconfigured" }, 503);
      }
    }
    if (!projectUrl.startsWith("https://") || !secretKey) {
      return respond({ error: "playback_service_misconfigured" }, 503);
    }

    const body = await req.json().catch(() => null);
    const dramaId = String(body?.dramaId || "");
    const episodeNumber = Number(body?.episodeNumber);
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(dramaId) || !Number.isInteger(episodeNumber) || episodeNumber < 1 || episodeNumber > 10000) {
      return respond({ error: "invalid_episode" }, 400);
    }

    // New Supabase secret keys are sent on apikey only, never as a Bearer JWT.
    const headers = { apikey: secretKey };
    const apiBase = projectUrl.replace(/\/$/, "");
    const episodeQuery = new URLSearchParams({
      select: "id,drama_id,episode_number,status,video_url",
      drama_id: "eq." + dramaId,
      episode_number: "eq." + episodeNumber,
      status: "eq.published",
      limit: "1",
    });
    const episodeResponse = await fetch(apiBase + "/rest/v1/episodes?" + episodeQuery.toString(), { headers });
    if (!episodeResponse.ok) return respond({ error: "catalog_lookup_failed" }, 502);
    const episodes = await episodeResponse.json();
    const episode = Array.isArray(episodes) ? episodes[0] : null;
    if (!episode?.id) return respond({ error: "episode_not_published" }, 404);

    const dramaQuery = new URLSearchParams({
      select: "id",
      id: "eq." + dramaId,
      status: "eq.published",
      limit: "1",
    });
    const dramaResponse = await fetch(apiBase + "/rest/v1/dramas?" + dramaQuery.toString(), { headers });
    if (!dramaResponse.ok) return respond({ error: "catalog_lookup_failed" }, 502);
    const dramas = await dramaResponse.json();
    if (!Array.isArray(dramas) || !dramas.length) return respond({ error: "drama_not_published" }, 404);

    const assetQuery = new URLSearchParams({
      select: "storage_path",
      episode_id: "eq." + episode.id,
      asset_type: "eq.video",
      order: "created_at.desc",
      limit: "1",
    });
    const assetResponse = await fetch(apiBase + "/rest/v1/studio_assets?" + assetQuery.toString(), { headers });
    if (!assetResponse.ok) return respond({ error: "asset_lookup_failed" }, 502);
    const assets = await assetResponse.json();
    const storagePath = String(Array.isArray(assets) ? assets[0]?.storage_path || "" : "");
    const requiredPrefix = dramaId + "/ep-" + episodeNumber + "/";
    if (!storagePath.startsWith(requiredPrefix) || storagePath.includes("..") || storagePath.includes("\\") || storagePath.includes("?") || storagePath.includes("#")) {
      return respond({ error: "published_video_not_found" }, 404);
    }

    const encodedPath = storagePath.split("/").map((part: string) => encodeURIComponent(part)).join("/");
    const signResponse = await fetch(apiBase + "/storage/v1/object/sign/nexora-videos/" + encodedPath, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: 21600 }),
    });
    if (!signResponse.ok) return respond({ error: "playback_signing_failed" }, 502);
    const signed = await signResponse.json();
    const signedPath = String(signed.signedURL || signed.signedUrl || "");
    if (!signedPath) return respond({ error: "playback_signing_failed" }, 502);
    const playbackUrl = signedPath.startsWith("https://") ? signedPath : apiBase + (signedPath.startsWith("/") ? signedPath : "/" + signedPath);
    return respond({ url: playbackUrl, expiresIn: 21600 });
  } catch (error) {
    console.error("NEXORA playback signing failed", error);
    return respond({ error: "playback_unavailable" }, 500);
  }
});
