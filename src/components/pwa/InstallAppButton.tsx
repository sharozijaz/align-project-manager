import { Download } from "lucide-react";
import { useInstallPrompt } from "../../pwa/useInstallPrompt";

export function InstallAppButton({ className = "" }: { className?: string }) {
  const { canInstall, install } = useInstallPrompt();

  if (!canInstall) return null;

  return (
    <button
      type="button"
      onClick={() => void install()}
      className={`flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[var(--dropdown-hover)] hover:text-[var(--text)] ${className}`}
    >
      <Download size={16} />
      Install Align
    </button>
  );
}
