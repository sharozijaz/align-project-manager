import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useThemeStore } from "../../store/themeStore";

interface ThemedPortalProps {
  children: ReactNode;
}

export function ThemedPortal({ children }: ThemedPortalProps) {
  const theme = useThemeStore((state) => state.theme);
  const accentColor = useThemeStore((state) => state.accentColor);

  if (typeof document === "undefined") return <>{children}</>;

  return createPortal(<div data-theme={theme} data-accent={accentColor}>{children}</div>, document.body);
}
