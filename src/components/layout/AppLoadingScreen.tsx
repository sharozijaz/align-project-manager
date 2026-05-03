import { motion } from "motion/react";
import { useThemeStore } from "../../store/themeStore";

export function AppLoadingScreen({ message = "Preparing your workspace" }: { message?: string }) {
  const theme = useThemeStore((state) => state.theme);

  return (
    <div data-theme={theme} className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="grid min-h-screen place-items-center p-6">
        <motion.div
          className="flex w-full max-w-sm flex-col items-center rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] px-8 py-10 text-center shadow-[var(--shadow-md)]"
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          <div className="relative">
            <motion.div
              className="absolute inset-0 rounded-[var(--radius-lg)] bg-[var(--brand-primary)] opacity-30 blur-xl"
              animate={{ scale: [0.9, 1.15, 0.9], opacity: [0.18, 0.34, 0.18] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
            <img src="/align-icon.png" alt="Align" className="relative h-16 w-16 rounded-[var(--radius-md)] shadow-[var(--shadow-sm)]" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold text-[var(--text)]">Align</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">{message}</p>
          <div className="mt-6 h-1.5 w-40 overflow-hidden rounded-full bg-[var(--bg-muted)]">
            <motion.div
              className="h-full w-16 rounded-full align-gradient"
              animate={{ x: [-70, 170] }}
              transition={{ duration: 1.15, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
