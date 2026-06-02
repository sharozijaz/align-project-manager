type DragPreviewPositionOptions = {
  offsetX?: number;
  offsetY?: number;
  lift?: number;
};

export function getClampedDragPreviewPosition(x: number, y: number, width: number, height: number, options: DragPreviewPositionOptions = {}) {
  const padding = 16;
  const fallbackOffset = 14;
  const viewportWidth = typeof window === "undefined" ? width + padding * 2 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? height + padding * 2 : window.innerHeight;
  const maxLeft = Math.max(padding, viewportWidth - width - padding);
  const maxTop = Math.max(padding, viewportHeight - height - padding);
  const preferredLeft =
    typeof options.offsetX === "number"
      ? x - options.offsetX
      : x + fallbackOffset + width > viewportWidth - padding
        ? x - width - fallbackOffset
        : x + fallbackOffset;
  const preferredTop = typeof options.offsetY === "number" ? y - options.offsetY - (options.lift ?? 0) : y + fallbackOffset;

  return {
    left: Math.min(Math.max(padding, preferredLeft), maxLeft),
    top: Math.min(Math.max(padding, preferredTop), maxTop),
  };
}
