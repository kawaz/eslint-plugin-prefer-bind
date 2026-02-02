import { RuleTester } from "eslint";
import rule from "../../../lib/rules/prefer-bind.js";

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

// RuleTester.run() creates its own test suite, so we don't wrap it in describe/it
ruleTester.run("prefer-bind", rule, {
  valid: [
    // Already using .bind()
    "controller.abort.bind(controller)",

    // Arrow function with arguments - cannot be converted
    "(x) => obj.method(x)",

    // Arrow function calling method with arguments (outside timer context)
    "() => obj.method(arg)",
    "arr.map(() => obj.method(arg))",

    // Arrow function with multiple statements
    "() => { obj.method(); cleanup(); }",

    // Regular function call, not method
    "() => doSomething()",

    // Computed property access
    "() => obj[method]()",

    // Async arrow function (ignored by default)
    "async () => obj.method()",
    "async () => await obj.method()",
    "async () => { obj.method(); }",
    "async () => { await obj.method(); }",

    // Async function expression (ignored by default)
    "const fn = async function() { obj.method(); }",
    "const fn = async function() { await obj.method(); }",

    // With onlyInLongLivedContexts: true, should not warn outside long-lived contexts
    {
      code: "const fn = () => obj.method()",
      options: [{ onlyInLongLivedContexts: true }],
    },
    {
      code: "arr.map(() => obj.method())",
      options: [{ onlyInLongLivedContexts: true }],
    },
  ],

  invalid: [
    // Simple arrow function wrappers
    {
      code: "() => controller.abort()",
      errors: [
        {
          messageId: "preferBind",
          data: { replacement: "controller.abort.bind(controller)" },
          suggestions: [
            {
              messageId: "preferBindSuggestion",
              output: "controller.abort.bind(controller)",
            },
          ],
        },
      ],
    },
    {
      code: "() => obj.method()",
      errors: [
        {
          messageId: "preferBind",
          suggestions: [
            {
              messageId: "preferBindSuggestion",
              output: "obj.method.bind(obj)",
            },
          ],
        },
      ],
    },

    // Block-body arrow functions
    {
      code: "() => { obj.method(); }",
      errors: [
        {
          messageId: "preferBind",
          suggestions: [
            {
              messageId: "preferBindSuggestion",
              output: "obj.method.bind(obj)",
            },
          ],
        },
      ],
    },

    // Function expressions (must be in expression context)
    {
      code: "const fn = function() { obj.method(); }",
      errors: [
        {
          messageId: "preferBind",
          suggestions: [
            {
              messageId: "preferBindSuggestion",
              output: "const fn = obj.method.bind(obj)",
            },
          ],
        },
      ],
    },

    // Chained member expressions
    {
      code: "() => this.controller.abort()",
      errors: [
        {
          messageId: "preferBind",
          suggestions: [
            {
              messageId: "preferBindSuggestion",
              output: "this.controller.abort.bind(this.controller)",
            },
          ],
        },
      ],
    },

    // onlyInLongLivedContexts option
    {
      code: "signal.addEventListener('abort', () => controller.abort())",
      options: [{ onlyInLongLivedContexts: true }],
      errors: [
        {
          messageId: "preferBind",
          suggestions: [
            {
              messageId: "preferBindSuggestion",
              output:
                "signal.addEventListener('abort', controller.abort.bind(controller))",
            },
          ],
        },
      ],
    },
    {
      code: "setTimeout(() => obj.cleanup(), 1000)",
      options: [{ onlyInLongLivedContexts: true }],
      errors: [
        {
          messageId: "preferBind",
          suggestions: [
            {
              messageId: "preferBindSuggestion",
              output: "setTimeout(obj.cleanup.bind(obj), 1000)",
            },
          ],
        },
      ],
    },

    // Custom longLivedContexts
    {
      code: "myCustomHandler(() => obj.method())",
      options: [
        {
          onlyInLongLivedContexts: true,
          longLivedContexts: ["myCustomHandler"],
        },
      ],
      errors: [
        {
          messageId: "preferBind",
          suggestions: [
            {
              messageId: "preferBindSuggestion",
              output: "myCustomHandler(obj.method.bind(obj))",
            },
          ],
        },
      ],
    },

    // setTimeout/setInterval with arguments - moves args after delay
    {
      code: "setTimeout(() => obj.method(arg1, arg2), 1000)",
      errors: [
        {
          messageId: "preferBind",
          suggestions: [
            {
              messageId: "preferBindSuggestion",
              output: "setTimeout(obj.method.bind(obj), 1000, arg1, arg2)",
            },
          ],
        },
      ],
    },
    {
      code: "setInterval(() => obj.tick(data), 100)",
      errors: [
        {
          messageId: "preferBind",
          suggestions: [
            {
              messageId: "preferBindSuggestion",
              output: "setInterval(obj.tick.bind(obj), 100, data)",
            },
          ],
        },
      ],
    },
    {
      code: "window.setTimeout(() => obj.method(arg), delay)",
      errors: [
        {
          messageId: "preferBind",
          suggestions: [
            {
              messageId: "preferBindSuggestion",
              output: "setTimeout(obj.method.bind(obj), delay, arg)",
            },
          ],
        },
      ],
    },
    {
      code: "setTimeout(function() { obj.method(arg); }, 1000)",
      errors: [
        {
          messageId: "preferBind",
          suggestions: [
            {
              messageId: "preferBindSuggestion",
              output: "setTimeout(obj.method.bind(obj), 1000, arg)",
            },
          ],
        },
      ],
    },

    // includeAsync option - async arrow functions
    {
      code: "async () => obj.method()",
      options: [{ includeAsync: true }],
      errors: [
        {
          messageId: "preferBind",
          suggestions: [
            {
              messageId: "preferBindSuggestion",
              output: "obj.method.bind(obj)",
            },
          ],
        },
      ],
    },
    {
      code: "async () => await obj.method()",
      options: [{ includeAsync: true }],
      errors: [
        {
          messageId: "preferBind",
          suggestions: [
            {
              messageId: "preferBindSuggestion",
              output: "obj.method.bind(obj)",
            },
          ],
        },
      ],
    },
    {
      code: "async () => { obj.method(); }",
      options: [{ includeAsync: true }],
      errors: [
        {
          messageId: "preferBind",
          suggestions: [
            {
              messageId: "preferBindSuggestion",
              output: "obj.method.bind(obj)",
            },
          ],
        },
      ],
    },
    {
      code: "async () => { await obj.method(); }",
      options: [{ includeAsync: true }],
      errors: [
        {
          messageId: "preferBind",
          suggestions: [
            {
              messageId: "preferBindSuggestion",
              output: "obj.method.bind(obj)",
            },
          ],
        },
      ],
    },

    // includeAsync option - async function expressions
    {
      code: "const fn = async function() { obj.method(); }",
      options: [{ includeAsync: true }],
      errors: [
        {
          messageId: "preferBind",
          suggestions: [
            {
              messageId: "preferBindSuggestion",
              output: "const fn = obj.method.bind(obj)",
            },
          ],
        },
      ],
    },
    {
      code: "const fn = async function() { await obj.method(); }",
      options: [{ includeAsync: true }],
      errors: [
        {
          messageId: "preferBind",
          suggestions: [
            {
              messageId: "preferBindSuggestion",
              output: "const fn = obj.method.bind(obj)",
            },
          ],
        },
      ],
    },
  ],
});
