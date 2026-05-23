import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const envFiles = [".env", ".env.local", ".env.production", ".env.production.local"];
const frontendCloudKeys = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "VITE_APP_URL",
  "VITE_PUBLIC_APP_URL",
  "VITE_GOOGLE_CLIENT_ID",
  "VITE_GOOGLE_REDIRECT_URI",
  "VITE_GOOGLE_CALENDAR_ID",
];
const serverSecretKeys = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_TOKEN_ENCRYPTION_KEY",
  "RESEND_API_KEY",
  "CRON_SECRET",
  "DATABASE_URL",
];

const allowConfiguredBackend = process.env.ALIGN_ALLOW_CONFIGURED_BACKEND_BUILD === "true";

function parseEnvFile(path) {
  if (!existsSync(path)) return [];

  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match) return null;
      return { key: match[1], hasValue: match[2].replace(/^['"]|['"]$/g, "").trim().length > 0 };
    })
    .filter(Boolean);
}

const configuredFrontendKeys = new Set();
const configuredServerKeys = new Set();

for (const key of frontendCloudKeys) {
  if ((process.env[key] ?? "").trim()) configuredFrontendKeys.add(key);
}

for (const key of serverSecretKeys) {
  if ((process.env[key] ?? "").trim()) configuredServerKeys.add(key);
}

for (const file of envFiles) {
  for (const entry of parseEnvFile(resolve(file))) {
    if (!entry.hasValue) continue;
    if (frontendCloudKeys.includes(entry.key)) configuredFrontendKeys.add(entry.key);
    if (serverSecretKeys.includes(entry.key)) configuredServerKeys.add(entry.key);
  }
}

if (configuredServerKeys.size > 0) {
  console.error("Public release guard failed: server-only secret keys are present in local env.");
  console.error(`Remove these from frontend/desktop release env files: ${[...configuredServerKeys].join(", ")}`);
  process.exit(1);
}

if (!allowConfiguredBackend && configuredFrontendKeys.size > 0) {
  console.error("Public release guard failed: cloud frontend env keys are configured.");
  console.error("Public builds should be local-only unless you explicitly intend to ship a configured backend.");
  console.error(`Configured keys: ${[...configuredFrontendKeys].join(", ")}`);
  console.error("Set ALIGN_ALLOW_CONFIGURED_BACKEND_BUILD=true only for a private or self-hosted configured release.");
  process.exit(1);
}

console.log("Public release env guard passed.");
