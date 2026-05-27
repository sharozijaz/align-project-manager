import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useThemeStore } from "../../store/themeStore";

interface ThemedPortalProps {
  children: ReactNode;
}

export function ThemedPortal({ children }: ThemedPortalProps) {
  const theme = useThemeStore((state) => state.theme);

  if (typeof document === "undefined") return <>{children}</>;

  return createPortal(<div data-theme={theme}>{children}</div>, document.body);
}
