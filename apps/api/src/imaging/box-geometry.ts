/** Axis-aligned rectangle in pixels; (x, y) is the top-left corner. */
export type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Size = {
  width: number;
  height: number;
};

/** Integer rectangle in the shape sharp's `extract()` expects. */
export type PixelRegion = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function boxArea(box: Box): number {
  return box.width * box.height;
}

export function intersectionOverUnion(a: Box, b: Box): number {
  const overlapWidth = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const overlapHeight = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  if (overlapWidth <= 0 || overlapHeight <= 0) return 0;

  const intersection = overlapWidth * overlapHeight;
  return intersection / (boxArea(a) + boxArea(b) - intersection);
}

export function scaleBox(box: Box, factor: number): Box {
  return { x: box.x * factor, y: box.y * factor, width: box.width * factor, height: box.height * factor };
}

/** Intersection of the box with the image rectangle [0, width] × [0, height]. */
export function clampBox(box: Box, bounds: Size): Box {
  const left = clamp(box.x, 0, bounds.width);
  const top = clamp(box.y, 0, bounds.height);
  const right = clamp(box.x + box.width, 0, bounds.width);
  const bottom = clamp(box.y + box.height, 0, bounds.height);
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** Grows the box by `paddingRatio` of its size on every side, then clamps it to whole pixels inside the image. */
export function paddedRegion(box: Box, paddingRatio: number, bounds: Size): PixelRegion {
  const paddingX = box.width * paddingRatio;
  const paddingY = box.height * paddingRatio;
  const left = Math.floor(clamp(box.x - paddingX, 0, bounds.width));
  const top = Math.floor(clamp(box.y - paddingY, 0, bounds.height));
  const right = Math.ceil(clamp(box.x + box.width + paddingX, 0, bounds.width));
  const bottom = Math.ceil(clamp(box.y + box.height + paddingY, 0, bounds.height));
  return { left, top, width: right - left, height: bottom - top };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
