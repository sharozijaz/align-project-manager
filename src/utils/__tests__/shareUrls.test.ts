import { afterEach, describe, expect, it, vi } from "vitest";
import { openExternalUrl } from "../../integrations/desktop/runtime";
import { openShareUrl } from "../shareUrls";

const openerMock = vi.hoisted(() => ({
  openUrl: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-opener", () => ({
  openUrl: openerMock.openUrl,
}));

function stubBrowserWindow() {
  const open = vi.fn();
  const location = {
    href: "https://app.local/start",
    origin: "https://app.local",
    protocol: "https:",
  };

  vi.stubGlobal("window", { location, open });
  return { location, open };
}

function stubTauriWindow() {
  const open = vi.fn();
  const location = {
    href: "tauri://localhost",
    origin: "tauri://localhost",
    protocol: "tauri:",
  };

  vi.stubGlobal("window", { __TAURI_INTERNALS__: {}, location, open });
  return { location, open };
}

afterEach(() => {
  openerMock.openUrl.mockReset();
  vi.unstubAllGlobals();
});

describe("openExternalUrl", () => {
  it("rejects unsupported protocols before handing links to the browser or desktop shell", async () => {
    await expect(openExternalUrl("javascript:alert(1)")).rejects.toThrow("Unsupported external URL.");
  });

  it("opens browser user links in a new tab when requested", async () => {
    const { location, open } = stubBrowserWindow();

    await openExternalUrl("https://example.com/path", { browserMode: "new-tab" });

    expect(open).toHaveBeenCalledWith("https://example.com/path", "_blank", "noopener,noreferrer");
    expect(location.href).toBe("https://app.local/start");
  });

  it("keeps same-tab browser navigation as the default", async () => {
    const { location, open } = stubBrowserWindow();

    await openExternalUrl("https://example.com/auth");

    expect(open).not.toHaveBeenCalled();
    expect(location.href).toBe("https://example.com/auth");
  });

  it("uses the Tauri opener plugin inside the desktop runtime", async () => {
    const { open } = stubTauriWindow();

    await openExternalUrl("https://example.com/resource", { browserMode: "new-tab" });

    expect(open).not.toHaveBeenCalled();
    expect(openerMock.openUrl).toHaveBeenCalledWith("https://example.com/resource");
  });
});

describe("openShareUrl", () => {
  it("opens share links through the shared external URL helper as new browser tabs", async () => {
    const { open } = stubBrowserWindow();

    await openShareUrl("https://app.local/share/token");

    expect(open).toHaveBeenCalledWith("https://app.local/share/token", "_blank", "noopener,noreferrer");
  });
});
