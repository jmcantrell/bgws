export default function shutdown(callback) {
  let closing = false;
  for (const signal of ["SIGINT", "SIGQUIT", "SIGTERM"]) {
    process.on(signal, async () => {
      if (closing) return;
      closing = true;
      await callback();
      process.exit();
    });
  }
}
