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

    // Arrow function with arguments - cannot be converted (outside timer)
    "(x) => obj.method(x)",
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
    "setTimeout(async () => obj.method(), 1000)",

    // Outside long-lived contexts (default: onlyInLongLivedContexts=true)
    "const fn = () => obj.method()",
    "arr.map(() => obj.method())",
    "() => controller.abort()",
    "() => obj.method()",
    "() => { obj.method(); }",
    "const fn = function() { obj.method(); }",
    "() => this.controller.abort()",
  ],

  invalid: [
    // addEventListener
    {
      code: "signal.addEventListener('abort', () => controller.abort())",
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

    // setTimeout without args
    {
      code: "setTimeout(() => obj.cleanup(), 1000)",
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

    // setInterval without args
    {
      code: "setInterval(() => obj.tick(), 100)",
      errors: [
        {
          messageId: "preferBind",
          suggestions: [
            {
              messageId: "preferBindSuggestion",
              output: "setInterval(obj.tick.bind(obj), 100)",
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

    // Block-body in long-lived context
    {
      code: "setTimeout(() => { obj.method(); }, 1000)",
      errors: [
        {
          messageId: "preferBind",
          suggestions: [
            {
              messageId: "preferBindSuggestion",
              output: "setTimeout(obj.method.bind(obj), 1000)",
            },
          ],
        },
      ],
    },

    // Function expression in long-lived context
    {
      code: "setTimeout(function() { obj.method(); }, 1000)",
      errors: [
        {
          messageId: "preferBind",
          suggestions: [
            {
              messageId: "preferBindSuggestion",
              output: "setTimeout(obj.method.bind(obj), 1000)",
            },
          ],
        },
      ],
    },

    // Chained member expressions in long-lived context
    {
      code: "setTimeout(() => this.controller.abort(), 1000)",
      errors: [
        {
          messageId: "preferBind",
          suggestions: [
            {
              messageId: "preferBindSuggestion",
              output: "setTimeout(this.controller.abort.bind(this.controller), 1000)",
            },
          ],
        },
      ],
    },

    // Custom longLivedContexts
    {
      code: "myCustomHandler(() => obj.method())",
      options: [{ longLivedContexts: ["myCustomHandler"] }],
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

    // onlyInLongLivedContexts: false - warns everywhere
    {
      code: "() => obj.method()",
      options: [{ onlyInLongLivedContexts: false }],
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
      code: "const fn = function() { obj.method(); }",
      options: [{ onlyInLongLivedContexts: false }],
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

    // includeAsync option - in long-lived context
    {
      code: "setTimeout(async () => obj.method(), 1000)",
      options: [{ includeAsync: true }],
      errors: [
        {
          messageId: "preferBind",
          suggestions: [
            {
              messageId: "preferBindSuggestion",
              output: "setTimeout(obj.method.bind(obj), 1000)",
            },
          ],
        },
      ],
    },
    {
      code: "setTimeout(async () => await obj.method(), 1000)",
      options: [{ includeAsync: true }],
      errors: [
        {
          messageId: "preferBind",
          suggestions: [
            {
              messageId: "preferBindSuggestion",
              output: "setTimeout(obj.method.bind(obj), 1000)",
            },
          ],
        },
      ],
    },
    {
      code: "setTimeout(async () => { obj.method(); }, 1000)",
      options: [{ includeAsync: true }],
      errors: [
        {
          messageId: "preferBind",
          suggestions: [
            {
              messageId: "preferBindSuggestion",
              output: "setTimeout(obj.method.bind(obj), 1000)",
            },
          ],
        },
      ],
    },
    {
      code: "setTimeout(async () => { await obj.method(); }, 1000)",
      options: [{ includeAsync: true }],
      errors: [
        {
          messageId: "preferBind",
          suggestions: [
            {
              messageId: "preferBindSuggestion",
              output: "setTimeout(obj.method.bind(obj), 1000)",
            },
          ],
        },
      ],
    },
    {
      code: "setTimeout(async function() { obj.method(); }, 1000)",
      options: [{ includeAsync: true }],
      errors: [
        {
          messageId: "preferBind",
          suggestions: [
            {
              messageId: "preferBindSuggestion",
              output: "setTimeout(obj.method.bind(obj), 1000)",
            },
          ],
        },
      ],
    },
    {
      code: "setTimeout(async function() { await obj.method(); }, 1000)",
      options: [{ includeAsync: true }],
      errors: [
        {
          messageId: "preferBind",
          suggestions: [
            {
              messageId: "preferBindSuggestion",
              output: "setTimeout(obj.method.bind(obj), 1000)",
            },
          ],
        },
      ],
    },
  ],
});
