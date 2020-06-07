export function trim(rect, margin) {
  return {
    top: rect.top + margin.top,
    left: rect.left + margin.left,
    width: rect.width - margin.left - margin.right,
    height: rect.height - margin.top - margin.bottom,
  };
}

// Returns dimensions for a rectangle with the same aspect ratio as
// `child` that fits maximally in `parent`.
export function fit(parent, child) {
  let width, height;
  if (parent.width / parent.height < child.width / child.height) {
    height = Math.trunc(parent.width / child.width) * child.height;
    width = Math.trunc(height / child.height) * child.width;
    return { width, height };
  } else {
    width = Math.trunc(parent.height / child.height) * child.width;
    height = Math.trunc(width / child.width) * child.height;
  }
  return { width, height };
}

// Returns top value that centers `child` within `parent` vertically.
export function getCenterVertical(parent, child) {
  return parent.top + Math.trunc(parent.height / 2 - child.height / 2);
}

// Returns left value that centers `child` within `parent` horizontally.
export function getCenterHorizontal(parent, child) {
  return parent.left + Math.trunc(parent.width / 2 - child.width / 2);
}
