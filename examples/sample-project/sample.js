// These should trigger warnings (long-lived contexts)
setTimeout(() => obj.method(), 1000);
setInterval(() => obj.tick(data), 100);
signal.addEventListener("abort", () => controller.abort());

// These should NOT trigger warnings (short-lived contexts)
arr.map(() => obj.transform());
const fn = () => obj.method();
