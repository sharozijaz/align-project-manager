import { Minus, Square, X } from "lucide-react";
import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauriRuntime } from "../../integrations/desktop/runtime";

export function DesktopTitleBar() {
  const [isDesktop, setIsDesktop] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!isTauriRuntime()) return;

    const appWindow = getCurrentWindow();
    setIsDesktop(true);
    void appWindow.isMaximized().then(setIsMaximized).catch(() => setIsMaximized(false));

    const unlisten = appWindow.onResized(() => {
      void appWindow.isMaximized().then(setIsMaximized).catch(() => setIsMaximized(false));
    });

    return () => {
      void unlisten.then((dispose) => dispose());
    };
  }, []);

  if (!isDesktop) return null;

  const appWindow = getCurrentWindow();

  const runWindowAction = (action: () => Promise<void>) => {
    void action().catch(() => {});
  };

  return (
    <header className="desktop-titlebar">
      <div
        className="desktop-titlebar__drag"
        data-tauri-drag-region
        onDoubleClick={() => runWindowAction(() => appWindow.toggleMaximize())}
      >
        <div className="desktop-titlebar__brand" data-tauri-drag-region>
          <span className="desktop-titlebar__mark" data-tauri-drag-region>
            <img src="/align-icon.png" alt="" draggable={false} />
          </span>
          <span className="desktop-titlebar__name" data-tauri-drag-region>
            Align
          </span>
        </div>
        <div className="desktop-titlebar__status" data-tauri-drag-region>
          Project workspace
        </div>
      </div>
      <div className="desktop-titlebar__controls">
        <button
          type="button"
          className="desktop-titlebar__control"
          aria-label="Minimize Align"
          title="Minimize"
          onClick={() => runWindowAction(() => appWindow.minimize())}
        >
          <Minus size={14} />
        </button>
        <button
          type="button"
          className="desktop-titlebar__control"
          aria-label={isMaximized ? "Restore Align" : "Maximize Align"}
          title={isMaximized ? "Restore" : "Maximize"}
          onClick={() => runWindowAction(() => appWindow.toggleMaximize())}
        >
          <Square size={11} />
        </button>
        <button
          type="button"
          className="desktop-titlebar__control desktop-titlebar__control--close"
          aria-label="Close Align to tray"
          title="Close to tray"
          onClick={() => runWindowAction(() => appWindow.close())}
        >
          <X size={14} />
        </button>
      </div>
    </header>
  );
}
