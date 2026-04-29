import { getEnv, handleApiError, requireMethod, serviceFetch } from "./_googleCalendar.js";

export default async function handler(req, res) {
  if (requireMethod(req, res, "GET")) return;

  const env = getEnv();
  const token = String(req.query.token || "").trim();

  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    res.status(500).json({ error: "Missing Supabase server configuration." });
    return;
  }

  if (!/^[a-f0-9]{48}$/iu.test(token)) {
    res.status(404).json({ error: "Client overview not found." });
    return;
  }

  try {
    const link = await findClientLink(env, token);
    if (!link) {
      res.status(404).json({ error: "Client overview not found or disabled." });
      return;
    }

    const projects = await Promise.all(
      (link.project_tokens || []).map(async (projectToken) => {
        const payload = await fetchProjectShare(env, projectToken);
        return payload;
      }),
    );

    res.status(200).json({
      clientName: link.name || "",
      projects: projects.filter(Boolean),
    });
  } catch (error) {
    handleApiError(res, error);
  }
}

async function findClientLink(env, token) {
  const url = new URL(`${env.supabaseUrl}/rest/v1/client_share_links`);
  url.searchParams.set("token", `eq.${token}`);
  url.searchParams.set("enabled", "eq.true");
  url.searchParams.set("select", "name,project_tokens");
  url.searchParams.set("limit", "1");

  const response = await serviceFetch(env, url);
  const rows = await response.json();
  return rows[0] || null;
}

async function fetchProjectShare(env, token) {
  const origin = env.appUrl || env.publicAppUrl || "";
  const base = origin ? origin.replace(/\/$/, "") : "";
  const url = base ? `${base}/api/project-share?token=${encodeURIComponent(token)}` : null;

  if (!url) return null;

  const response = await fetch(url);
  if (!response.ok) return null;
  return response.json();
}
