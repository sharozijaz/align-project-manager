export type DragPreviewAnchor = {
  offsetX?: number;
  offsetY?: number;
};

type DragPreviewPositionOptions = DragPreviewAnchor & {
  padding?: number;
};

const DEFAULT_PADDING = 16;
const MIN_POINTER_INSET = 12;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(min, value), max);
}

function clampPreviewOffset(value: number, previewSize: number) {
  if (previewSize <= MIN_POINTER_INSET * 2) return previewSize / 2;
  return clamp(value, MIN_POINTER_INSET, previewSize - MIN_POINTER_INSET);
}

export function getDragPreviewAnchor(element: HTMLElement, pointerX: number, pointerY: number, previewWidth: number, previewHeight: number): Required<DragPreviewAnchor> {
  const rect = element.getBoundingClientRect();

  return {
    offsetX: clampPreviewOffset(pointerX - rect.left, previewWidth),
    offsetY: clampPreviewOffset(pointerY - rect.top, previewHeight),
  };
}

export function getClampedDragPreviewPosition(x: number, y: number, width: number, height: number, options: DragPreviewPositionOptions = {}) {
  const padding = options.padding ?? DEFAULT_PADDING;
  const viewportWidth = typeof window === "undefined" ? width + padding * 2 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? height + padding * 2 : window.innerHeight;
  const maxLeft = Math.max(padding, viewportWidth - width - padding);
  const maxTop = Math.max(padding, viewportHeight - height - padding);
  const preferredLeft = x - clampPreviewOffset(options.offsetX ?? MIN_POINTER_INSET, width);
  const preferredTop = y - clampPreviewOffset(options.offsetY ?? MIN_POINTER_INSET, height);

  return {
    left: clamp(preferredLeft, padding, maxLeft),
    top: clamp(preferredTop, padding, maxTop),
  };
}
