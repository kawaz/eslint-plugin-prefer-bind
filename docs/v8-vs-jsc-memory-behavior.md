# V8 vs JSC: Closure Memory Capture Behavior

This document describes the differences in memory behavior between V8 (Node.js) and JSC (JavaScriptCore, used by Bun) when dealing with closures that capture surrounding scope.

## Background

A [memory leak fix](https://x.com/jarredsumner/status/2017825694731145388) in Claude Code reduced memory usage by ~1GB by changing:

```javascript
// Before: Arrow function captures surrounding scope
() => controller.abort()

// After: bind() only retains reference to controller
controller.abort.bind(controller)
```

Claude Code uses Bun (JSC). This raised the question: would the same issue occur with Node.js (V8)?

## Test Results

| Scenario | Node.js (V8) | Bun (JSC) |
|----------|--------------|-----------|
| Explicit reference + uncalled listener | **+0.08 MB** | **+100.06 MB** |
| After abort() called | +0.06 MB | +1.01 MB |
| After scope exit | +0.04 MB | **+100.02 MB** |

## Key Findings

### V8's Aggressive Optimizations

V8 performs aggressive optimizations that can release memory even when closures explicitly reference large objects:

- **Dead Code Elimination**: Optimizes away references in code paths that are never executed
- **Escape Analysis**: Detects when references are captured but never actually used

As a result, even with explicit references, V8 may garbage collect objects if the listener is never invoked.

### JSC's Conservative Approach

JSC (Bun) is more conservative:

- Objects referenced by listeners are **reliably retained** for the listener's lifetime
- References persist even after the enclosing scope exits
- Memory is only released after `abort()` is called and the listener is removed

## Why `.bind()` is Effective

```javascript
// Arrow function: creates closure with Scope Chain
() => controller.abort()
// ↑ Captures entire lexical environment (this, init, options, etc.)

// bind(): no Scope Chain
controller.abort.bind(controller)
// ↑ Only retains reference to controller object
```

The key difference:
- **Closures** capture the entire lexical environment through the Scope Chain
- **`bind()`** creates a new function without a Scope Chain, only storing the bound `this` value

## Conclusion

**The same code may cause memory leaks only in Bun (JSC), not in Node.js (V8).**

V8's aggressive optimizations can mask memory issues that become apparent in JSC. When writing code that needs to work across both runtimes, prefer `.bind()` over closure wrappers for callbacks passed to long-lived contexts.

## References

- [Original tweet about Claude Code memory fix](https://x.com/jarredsumner/status/2017825694731145388)
- [V8 Blog: An Introduction to Speculative Optimization](https://v8.dev/blog/speculative-optimization)
- [WebKit Blog: Introducing the JIT](https://webkit.org/blog/3362/introducing-the-webkit-ftl-jit/)
- [MDN: Closures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures)
- [MDN: Function.prototype.bind()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_objects/Function/bind)

## Test Environment

- Node.js (V8): v25.3.0
- Bun (JSC): 1.3.6
