// Should warn
setTimeout(() => obj.method(), 1000);
setInterval(() => obj.tick(data), 100);
signal.addEventListener('abort', () => controller.abort());

// Should not warn (short-lived)
arr.map(() => obj.transform());
const fn = () => obj.method();
