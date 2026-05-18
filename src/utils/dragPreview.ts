export function getClampedDragPreviewPosition(x: number, y: number, width: number, height: number) {
  const padding = 16;
  const offset = 14;
  const viewportWidth = typeof window === "undefined" ? width + padding * 2 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? height + padding * 2 : window.innerHeight;
  const maxLeft = Math.max(padding, viewportWidth - width - padding);
  const maxTop = Math.max(padding, viewportHeight - height - padding);
  const preferredLeft = x + offset + width > viewportWidth - padding ? x - width - offset : x + offset;

  return {
    left: Math.min(Math.max(padding, preferredLeft), maxLeft),
    top: Math.min(Math.max(padding, y + offset), maxTop),
  };
}
