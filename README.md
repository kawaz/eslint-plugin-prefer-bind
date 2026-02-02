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

This pattern caused a [~1GB memory leak in Claude Code](https://x.com/jarredsumner/status/2017825694731145388) when running on Bun (JSC). See [V8 vs JSC Memory Behavior](./docs/v8-vs-jsc-memory-behavior.md) for details on why this affects JSC more than V8.

## Installation

```bash
npm install --save-dev @kawaz/eslint-plugin-prefer-bind
# or
bun add -d @kawaz/eslint-plugin-prefer-bind
```

## Usage

### ESLint Flat Config (eslint.config.js)

```javascript
import preferBind from "@kawaz/eslint-plugin-prefer-bind";

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

### oxlint (experimental)

oxlint supports JS plugins experimentally. Use an alias to set the plugin name:

```json
// .oxlintrc.json
{
  "jsPlugins": [
    { "name": "prefer-bind", "specifier": "@kawaz/eslint-plugin-prefer-bind" }
  ],
  "rules": {
    "prefer-bind/prefer-bind": "warn"
  }
}
```

## Rule: `prefer-bind/prefer-bind`

By default, detects closure wrappers in **long-lived contexts** (setTimeout, setInterval, addEventListener, etc.) that can be replaced with `.bind()`:

```javascript
// ❌ Warns (long-lived context)
setTimeout(() => obj.method(), 1000)
signal.addEventListener('abort', () => controller.abort())

// ✅ OK (short-lived context - no memory leak risk)
arr.map(() => obj.transform())
const fn = () => obj.method()

// ✅ OK (already using bind)
setTimeout(obj.method.bind(obj), 1000)
```

### setTimeout/setInterval with Arguments

For `setTimeout` and `setInterval`, the rule also handles closures with arguments by moving them after the delay parameter:

```javascript
// ❌ Warns
setTimeout(() => obj.method(arg1, arg2), 1000)

// ✅ Suggested fix
setTimeout(obj.method.bind(obj), 1000, arg1, arg2)
```

### Options

```javascript
"prefer-bind/prefer-bind": ["warn", {
  // Only warn in long-lived contexts (default: true)
  "onlyInLongLivedContexts": true,

  // Functions that hold callbacks long-term (default shown below)
  "longLivedContexts": [
    "addEventListener",
    "setTimeout",
    "setInterval",
    "on",
    "once",
    "subscribe"
  ],

  // Include async functions in detection (default: false)
  "includeAsync": false
}]
```

### `onlyInLongLivedContexts`

Default is `true` - only warns in long-lived contexts where memory leaks are a real concern.

Set to `false` to warn everywhere (not recommended for most codebases):

```javascript
// With onlyInLongLivedContexts: false

// ❌ Warns even in short-lived contexts
arr.map(() => obj.transform());
const fn = () => obj.method();
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
