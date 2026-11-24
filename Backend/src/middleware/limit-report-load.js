export function createReportLoadLimiter({
  concurrency = 8,
  maxWaiting = 120,
  waitMs = 8000,
} = {}) {
  let running = 0;
  const waiting = new Set();

  function rejectBusy(res) {
    res.set("Retry-After", "2");
    res.set("Cache-Control", "no-store");
    return res.status(503).json({
      code: "REPORT_BUSY",
      error: "The clinic report is busy. Try again in a few seconds.",
    });
  }

  return (handler) => (req, res, next) => {
    function run() {
      running += 1;
      void Promise.resolve()
        .then(() => handler(req, res, next))
        .catch(next)
        .finally(() => {
          running -= 1;
          waiting.values().next().value?.();
        });
    }

    if (res.destroyed) return;
    if (running < concurrency) return run();
    if (waiting.size >= maxWaiting) return rejectBusy(res);

    const cleanup = () => {
      waiting.delete(start);
      clearTimeout(timer);
      res.off("close", cleanup);
    };
    const start = () => {
      cleanup();
      run();
    };
    const timer = setTimeout(() => {
      cleanup();
      rejectBusy(res);
    }, waitMs);
    waiting.add(start);
    res.once("close", cleanup);
  };
}

// Reports share a limit to leave pool capacity for front-desk requests.
export const limitReportLoad = createReportLoadLimiter();
