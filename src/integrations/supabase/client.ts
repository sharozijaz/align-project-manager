import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const rawAllowedEmails = import.meta.env.VITE_ALLOWED_EMAILS;

export const normalizeSupabaseUrl = (value?: string) => {
  if (!value) return "";

  const withProtocol = value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`;
  return withProtocol.replace(/\/rest\/v1\/?$/u, "").replace(/\/$/u, "");
};

export const supabaseUrl = normalizeSupabaseUrl(rawSupabaseUrl);
export const supabaseConfigIssue = !rawSupabaseUrl
  ? "Missing VITE_SUPABASE_URL."
  : !supabaseAnonKey
    ? "Missing VITE_SUPABASE_ANON_KEY."
    : rawSupabaseUrl.includes("/rest/v1")
      ? "Your Supabase URL included /rest/v1, so it was cleaned automatically. Update .env.local to use only the project URL."
      : rawSupabaseUrl.startsWith("http")
        ? ""
        : "Your Supabase URL was missing https://, so it was added automatically. Update .env.local when you can.";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const allowedEmails = (rawAllowedEmails ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const isEmailAllowed = (email?: string) =>
  !allowedEmails.length || Boolean(email && allowedEmails.includes(email.toLowerCase()));

export const supabase = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
