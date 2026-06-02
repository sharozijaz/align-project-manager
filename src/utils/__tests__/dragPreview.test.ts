import { afterEach, describe, expect, it, vi } from "vitest";
import { getClampedDragPreviewPosition } from "../dragPreview";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getClampedDragPreviewPosition", () => {
  it("keeps the dragged card near the cursor using the original grab offset", () => {
    vi.stubGlobal("window", { innerWidth: 800, innerHeight: 600 });

    expect(getClampedDragPreviewPosition(400, 300, 260, 150, { offsetX: 40, offsetY: 30, lift: 8 })).toEqual({
      left: 360,
      top: 262,
    });
  });

  it("clamps previews inside the viewport", () => {
    vi.stubGlobal("window", { innerWidth: 800, innerHeight: 600 });

    expect(getClampedDragPreviewPosition(5, 5, 260, 150, { offsetX: 40, offsetY: 30, lift: 8 })).toEqual({
      left: 16,
      top: 16,
    });
  });
});
