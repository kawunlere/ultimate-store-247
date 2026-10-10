export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const clientIP = request.headers.get("CF-Connecting-IP") || "unknown";
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
      "Access-Control-Allow-Headers": "Content-Type, X-Admin-Token",
      "Access-Control-Max-Age": "86400"
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    try {
      const rateKey = "ratelimit:" + clientIP;
      const rateData = await env.KEYS.get(rateKey);
      if (rateData) {
        const count = parseInt(rateData) || 0;
        if (count > 10) {
          return jsonResp({ success: false, message: "Too many requests" }, 429, corsHeaders);
        }
        await env.KEYS.put(rateKey, String(count + 1), { expirationTtl: 60 });
      } else {
        await env.KEYS.put(rateKey, "1", { expirationTtl: 60 });
      }
    } catch (e) {}
    if (path === "/api/generate-key" && request.method === "POST") {
      try {
        const body = await request.json();
        const deviceId = body.deviceId;
        const type = body.type;
        if (!deviceId || typeof deviceId !== "string" || deviceId.length < 5 || deviceId.length > 50) {
          return jsonResp({ success: false, message: "Invalid device ID" }, 400, corsHeaders);
        }
        const existing = await env.KEYS.get(deviceId);
        if (existing) {
          const data = JSON.parse(existing);
          if (new Date(data.expires) > new Date()) {
            return jsonResp({ success: true, key: data.key, expires: data.expires, alreadyExists: true }, 200, corsHeaders);
          }
        }
        const days = type === "premium" ? 30 : 2;
        const key = genKey();
        const expires = new Date(Date.now() + days * 86400000).toISOString();
        const created = new Date().toISOString();
        const keyData = {
          key: key,
          deviceId: deviceId,
          expires: expires,
          created: created,
          type: type || "free",
          ip: clientIP,
          source: "auto",
          lastVerified: null
        };
        await env.KEYS.put(deviceId, JSON.stringify(keyData));
        return jsonResp({ success: true, key: key, expires: expires, type: type || "free" }, 200, corsHeaders);
      } catch (e) {
        return jsonResp({ success: false, message: "Server error" }, 500, corsHeaders);
      }
    }
    if (path === "/api/verify-key" && request.method === "POST") {
      try {
        const body = await request.json();
        const deviceId = body.deviceId;
        const key = body.key;
        if (!deviceId || !key) {
          return jsonResp({ valid: false, message: "Missing data" }, 400, corsHeaders);
        }
        const stored = await env.KEYS.get(deviceId);
        if (!stored) {
          return jsonResp({ valid: false, message: "No key for this device" }, 200, corsHeaders);
        }
        const data = JSON.parse(stored);
        if (data.key !== key) {
          return jsonResp({ valid: false, message: "Key does not match device" }, 200, corsHeaders);
        }
        if (new Date(data.expires) < new Date()) {
          return jsonResp({ valid: false, message: "Key expired", expires: data.expires }, 200, corsHeaders);
        }
        data.lastVerified = new Date().toISOString();
        data.verifyCount = (data.verifyCount || 0) + 1;
        await env.KEYS.put(deviceId, JSON.stringify(data));
        return jsonResp({ valid: true, expires: data.expires, type: data.type }, 200, corsHeaders);
      } catch (e) {
        return jsonResp({ valid: false, message: "Server error" }, 500, corsHeaders);
      }
    }
    function isAdmin(req) {
      const token = req.headers.get("X-Admin-Token");
      return token === env.ADMIN_TOKEN;
    }
    if (path === "/api/admin/list" && request.method === "GET") {
      if (!isAdmin(request)) return jsonResp({ error: "Unauthorized" }, 401, corsHeaders);
      try {
        const list = await env.KEYS.list();
        const keys = [];
        for await (const k of list.keys) {
          if (k.name.startsWith("ratelimit:")) continue;
          const value = await env.KEYS.get(k.name);
          if (value) {
            try { keys.push({ deviceId: k.name, ...JSON.parse(value) }); } catch (e) {}
          }
        }
        return jsonResp({ count: keys.length, keys: keys }, 200, corsHeaders);
      } catch (e) {
        return jsonResp({ error: e.message }, 500, corsHeaders);
      }
    }
    if (path === "/api/admin/generate-free" && request.method === "POST") {
      if (!isAdmin(request)) return jsonResp({ error: "Unauthorized" }, 401, corsHeaders);
      try {
        const body = await request.json();
        const deviceId = body.deviceId;
        const days = parseInt(body.days) || 2;
        if (!deviceId || deviceId.length < 5) {
          return jsonResp({ success: false, message: "Invalid device ID" }, 400, corsHeaders);
        }
        const key = genKey();
        const expires = new Date(Date.now() + days * 86400000).toISOString();
        const keyData = {
          key: key, deviceId: deviceId, expires: expires,
          created: new Date().toISOString(), type: "free",
          source: "admin", lastVerified: null
        };
        await env.KEYS.put(deviceId, JSON.stringify(keyData));
        return jsonResp({ success: true, key: key, expires: expires, type: "free" }, 200, corsHeaders);
      } catch (e) {
        return jsonResp({ error: e.message }, 500, corsHeaders);
      }
    }
    if (path === "/api/admin/generate-premium" && request.method === "POST") {
      if (!isAdmin(request)) return jsonResp({ error: "Unauthorized" }, 401, corsHeaders);
      try {
        const body = await request.json();
        const deviceId = body.deviceId;
        const days = parseInt(body.days) || 30;
        if (!deviceId || deviceId.length < 5) {
          return jsonResp({ success: false, message: "Invalid device ID" }, 400, corsHeaders);
        }
        const key = genKey();
        const expires = new Date(Date.now() + days * 86400000).toISOString();
        const keyData = {
          key: key, deviceId: deviceId, expires: expires,
          created: new Date().toISOString(), type: "premium",
          source: "admin", lastVerified: null
        };
        await env.KEYS.put(deviceId, JSON.stringify(keyData));
        return jsonResp({ success: true, key: key, expires: expires, type: "premium" }, 200, corsHeaders);
      } catch (e) {
        return jsonResp({ error: e.message }, 500, corsHeaders);
      }
    }
    if (path.startsWith("/api/admin/delete/") && request.method === "DELETE") {
      if (!isAdmin(request)) return jsonResp({ error: "Unauthorized" }, 401, corsHeaders);
      const deviceId = decodeURIComponent(path.replace("/api/admin/delete/", ""));
      try {
        await env.KEYS.delete(deviceId);
        return jsonResp({ success: true, deleted: deviceId }, 200, corsHeaders);
      } catch (e) {
        return jsonResp({ error: e.message }, 500, corsHeaders);
      }
    }
    if (path === "/api/admin/stats" && request.method === "GET") {
      if (!isAdmin(request)) return jsonResp({ error: "Unauthorized" }, 401, corsHeaders);
      try {
        const list = await env.KEYS.list();
        let total = 0, active = 0, expired = 0, premium = 0, free = 0;
        const now = new Date();
        for await (const k of list.keys) {
          if (k.name.startsWith("ratelimit:")) continue;
          const value = await env.KEYS.get(k.name);
          if (!value) continue;
          try {
            const data = JSON.parse(value);
            total++;
            if (data.type === "premium") premium++; else free++;
            if (new Date(data.expires) > now) active++; else expired++;
          } catch (e) {}
        }
        return jsonResp({ total: total, active: active, expired: expired, premium: premium, free: free }, 200, corsHeaders);
      } catch (e) {
        return jsonResp({ error: e.message }, 500, corsHeaders);
      }
    }
    return jsonResp({ error: "Not found", path: path }, 404, corsHeaders);
  }
};

function genKey() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const segments = [];
  for (let s = 0; s < 4; s++) {
    let segment = "";
    for (let i = 0; i < 4; i++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    segments.push(segment);
  }
  return segments.join("-");
}

function jsonResp(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: { "Content-Type": "application/json", ...headers }
  });
}
