export function clear(canvas, context) {
  const { width, height } = canvas;
  context.clearRect(0, 0, width, height);
}

export function resize(canvas, box) {
  const { width, height } = box;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.width = width;
  canvas.height = height;
}
