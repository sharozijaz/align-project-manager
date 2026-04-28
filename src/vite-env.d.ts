/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_ALLOWED_EMAILS?: string;
  readonly VITE_APP_URL?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_GOOGLE_REDIRECT_URI?: string;
  readonly VITE_GOOGLE_CALENDAR_ID?: string;
  readonly VITE_APP_VERSION?: string;
  readonly VITE_APP_BUILD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
