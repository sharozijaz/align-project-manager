export function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;

  if (typeof error === "object" && error) {
    const candidate = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const parts = [candidate.message, candidate.details, candidate.hint, candidate.code]
      .filter((part): part is string => typeof part === "string" && part.length > 0);

    if (parts.length) {
      const message = parts.join(" ");

      if (message.toLowerCase().includes("permission denied for table")) {
        return `${message} Run supabase/grants.sql in the Supabase SQL Editor, then try again.`;
      }

      return message;
    }
  }

  return fallback;
}
