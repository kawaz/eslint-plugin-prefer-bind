# eslint-plugin-prefer-bind

ESLint plugin to prefer `.bind()` over closure wrappers for simple method calls to prevent memory leaks.

## The Problem

Closures capture the entire surrounding scope, which can cause memory leaks when stored in long-lived contexts:

```javascript
// This captures everything in scope (this, init, options, largeBuffer, etc.)
signal.addEventListener('abort', () => controller.abort());

// This only retains a reference to controller
signal.addEventListener('abort', controller.abort.bind(controller));
```

This pattern caused a [~1GB memory leak in Claude Code](https://x.com/AmanPathak_/status/1885378327232827723) when running on Bun (JSC). See [V8 vs JSC Memory Behavior](./docs/v8-vs-jsc-memory-behavior.md) for details on why this affects JSC more than V8.

## Installation

```bash
npm install --save-dev eslint-plugin-prefer-bind
# or
bun add -d eslint-plugin-prefer-bind
```

## Usage

### ESLint Flat Config (eslint.config.js)

```javascript
import preferBind from "eslint-plugin-prefer-bind";

export default [
  {
    plugins: {
      "prefer-bind": preferBind,
    },
    rules: {
      "prefer-bind/prefer-bind": "warn",
    },
  },
];
```

## Rule: `prefer-bind/prefer-bind`

Detects closure wrappers that can be replaced with `.bind()`:

```javascript
// ❌ Warns
() => obj.method()
() => { obj.method(); }
function() { obj.method(); }

// ✅ OK
obj.method.bind(obj)
```

### Options

```javascript
"prefer-bind/prefer-bind": ["warn", {
  // Only warn when passed to long-lived contexts (default: false)
  "onlyInLongLivedContexts": true,

  // Custom list of long-lived context functions (default shown below)
  "longLivedContexts": [
    "addEventListener",
    "setTimeout",
    "setInterval",
    "on",
    "once",
    "subscribe"
  ],

  // Include async functions in detection (default: false)
  // Warning: async and sync functions have different return types
  "includeAsync": false
}]
```

### `onlyInLongLivedContexts`

When `true`, only warns when the closure is passed to functions known to hold references long-term:

```javascript
// With onlyInLongLivedContexts: true

// ❌ Warns (addEventListener holds reference)
signal.addEventListener('abort', () => controller.abort());

// ✅ OK (map doesn't hold reference long-term)
items.map(() => obj.transform());
```

### `includeAsync`

When `true`, also detects async functions:

```javascript
// With includeAsync: true

// ❌ Warns
async () => obj.method()
async () => await obj.method()

// Note: Replacing async with .bind() changes behavior if method is sync!
```

## Why Not Auto-Fix?

This rule provides **suggestions** instead of auto-fixes because:

1. **Async functions**: `async () => obj.method()` returns a Promise, but `obj.method.bind(obj)` returns whatever `method()` returns
2. **Side effects**: The replacement changes when the method lookup happens (call time vs. definition time)

Apply suggestions manually after verifying the behavior is equivalent.

## License

MIT
