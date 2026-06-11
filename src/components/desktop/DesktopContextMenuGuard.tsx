import { useEffect } from "react";
import { isTauriRuntime } from "../../integrations/desktop/runtime";

const EDITABLE_SELECTOR = [
  "input",
  "textarea",
  "select",
  "[contenteditable='true']",
  "[data-allow-native-menu='true']",
].join(",");

export function DesktopContextMenuGuard() {
  useEffect(() => {
    if (!isTauriRuntime()) return;

    const handleContextMenu = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest(EDITABLE_SELECTOR)) return;
      event.preventDefault();
    };

    window.addEventListener("contextmenu", handleContextMenu, { capture: true });
    return () => window.removeEventListener("contextmenu", handleContextMenu, { capture: true });
  }, []);

  return null;
}
