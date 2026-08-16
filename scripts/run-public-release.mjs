import { spawnSync } from "node:child_process";

const cloudAndSecretKeys = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "VITE_ALLOWED_EMAILS",
  "VITE_AUTH_METHOD",
  "VITE_APP_URL",
  "VITE_PUBLIC_APP_URL",
  "VITE_GOOGLE_CLIENT_ID",
  "VITE_GOOGLE_REDIRECT_URI",
  "VITE_GOOGLE_CALENDAR_ID",
  "APP_URL",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ALLOWED_API_ORIGINS",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REDIRECT_URI",
  "GOOGLE_CALENDAR_ID",
  "GOOGLE_TOKEN_ENCRYPTION_KEY",
  "CRON_SECRET",
  "RESEND_API_KEY",
  "REMINDER_EMAIL_FROM",
  "REMINDER_EMAIL_REPLY_TO",
  "DATABASE_URL",
];

const scripts = process.argv.slice(2);

if (!scripts.length) {
  console.error("Usage: node scripts/run-public-release.mjs <npm-script> [npm-script...]");
  process.exit(1);
}

const env = {
  ...process.env,
  ALIGN_PUBLIC_RELEASE: "true",
};

for (const key of cloudAndSecretKeys) {
  delete env[key];
}

for (const script of scripts) {
  if (!/^[\w:-]+$/u.test(script)) {
    console.error(`Invalid npm script name: ${script}`);
    process.exit(1);
  }

  console.log(`\n> public release: npm run ${script}`);
  const result = spawnSync(`npm run ${script}`, {
    stdio: "inherit",
    env,
    shell: true,
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
