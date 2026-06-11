import { afterEach, describe, expect, it, vi } from "vitest";
import { getClampedDragPreviewPosition, getDragPreviewAnchor } from "../dragPreview";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getClampedDragPreviewPosition", () => {
  it("keeps the dragged card near the cursor using the original grab offset", () => {
    vi.stubGlobal("window", { innerWidth: 800, innerHeight: 600 });

    expect(getClampedDragPreviewPosition(400, 300, 260, 150, { offsetX: 40, offsetY: 30 })).toEqual({
      left: 360,
      top: 270,
    });
  });

  it("clamps previews inside the viewport", () => {
    vi.stubGlobal("window", { innerWidth: 800, innerHeight: 600 });

    expect(getClampedDragPreviewPosition(5, 5, 260, 150, { offsetX: 40, offsetY: 30 })).toEqual({
      left: 16,
      top: 16,
    });
  });

  it("does not flip the preview away from the cursor near the right edge", () => {
    vi.stubGlobal("window", { innerWidth: 800, innerHeight: 600 });

    expect(getClampedDragPreviewPosition(760, 300, 260, 150, { offsetX: 40, offsetY: 30 })).toEqual({
      left: 524,
      top: 270,
    });
  });

  it("creates a stable anchor from the grabbed source element", () => {
    const element = {
      getBoundingClientRect: () => ({
        left: 100,
        top: 200,
        right: 260,
        bottom: 260,
        width: 160,
        height: 60,
        x: 100,
        y: 200,
        toJSON: () => ({}),
      }),
    } as HTMLElement;

    expect(getDragPreviewAnchor(element, 130, 220, 320, 120)).toEqual({
      offsetX: 30,
      offsetY: 20,
    });
  });

  it("keeps tiny source chips close without pinning the pointer to the edge", () => {
    const element = {
      getBoundingClientRect: () => ({
        left: 100,
        top: 200,
        right: 108,
        bottom: 208,
        width: 8,
        height: 8,
        x: 100,
        y: 200,
        toJSON: () => ({}),
      }),
    } as HTMLElement;

    expect(getDragPreviewAnchor(element, 102, 202, 320, 120)).toEqual({
      offsetX: 12,
      offsetY: 12,
    });
  });
});
