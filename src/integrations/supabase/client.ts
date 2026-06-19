import { createClient } from "@supabase/supabase-js";
import { DESKTOP_AUTH_REDIRECT_URL, isTauriRuntime } from "../desktop/runtime";
import type { Database } from "./types";

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const rawAllowedEmails = import.meta.env.VITE_ALLOWED_EMAILS;
const rawAppUrl = import.meta.env.VITE_APP_URL;
const rawAuthMethod = import.meta.env.VITE_AUTH_METHOD;

const normalizeSupabaseUrl = (value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed) return "";

  const withProtocol = trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`;
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
const allowedEmails = (rawAllowedEmails ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const isEmailAllowed = (email?: string) =>
  !allowedEmails.length || Boolean(email && allowedEmails.includes(email.toLowerCase()));

const normalizeAppUrl = (value?: string) => {
  if (!value?.trim()) return "";

  const trimmed = value.trim();
  const withProtocol = trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`;

  return `${withProtocol.replace(/\/$/u, "")}/`;
};

export const appUrl = normalizeAppUrl(rawAppUrl);
type AuthMethod = "google" | "magic_link" | "both";

const normalizeAuthMethod = (value?: string): AuthMethod => {
  if (value === "google" || value === "magic_link" || value === "both") return value;
  return import.meta.env.PROD ? "google" : "both";
};

const authMethod = normalizeAuthMethod(rawAuthMethod);
export const canUseGoogleAuth = authMethod === "google" || authMethod === "both";
export const canUseMagicLinkAuth = authMethod === "magic_link" || authMethod === "both";
const getRuntimeRedirectUrl = () => {
  if (typeof window === "undefined") return "";

  const { origin } = window.location;

  if (isTauriRuntime()) {
    return DESKTOP_AUTH_REDIRECT_URL;
  }

  if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
    return `${origin.replace(/\/$/u, "")}/`;
  }

  return "";
};

export const getAuthRedirectUrl = () => getRuntimeRedirectUrl() || appUrl || `${window.location.origin}/`;

export const supabase = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        flowType: "pkce",
      },
    })
  : null;
