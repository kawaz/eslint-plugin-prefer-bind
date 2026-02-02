import { describe, it, expect } from "vitest";
import { RuleTester } from "eslint";
import rule from "../../../lib/rules/prefer-bind.js";

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

describe("prefer-bind", () => {
  it("should pass valid cases", () => {
    ruleTester.run("prefer-bind", rule, {
      valid: [
        // Already using .bind()
        "controller.abort.bind(controller)",

        // Arrow function with arguments - cannot be converted
        "(x) => obj.method(x)",

        // Arrow function calling method with arguments
        "() => obj.method(arg)",

        // Arrow function with multiple statements
        "() => { obj.method(); cleanup(); }",

        // Regular function call, not method
        "() => doSomething()",

        // Computed property access
        "() => obj[method]()",

        // Async arrow function
        "async () => obj.method()",

        // With onlyInLongLivedContexts: true, should not warn outside long-lived contexts
        {
          code: "const fn = () => obj.method()",
          options: [{ onlyInLongLivedContexts: true }],
        },
      ],
      invalid: [],
    });
  });

  it("should detect simple arrow function wrappers", () => {
    ruleTester.run("prefer-bind", rule, {
      valid: [],
      invalid: [
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
      ],
    });
  });

  it("should detect block-body arrow functions", () => {
    ruleTester.run("prefer-bind", rule, {
      valid: [],
      invalid: [
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
      ],
    });
  });

  it("should detect function expressions", () => {
    ruleTester.run("prefer-bind", rule, {
      valid: [],
      invalid: [
        {
          code: "function() { obj.method(); }",
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
      ],
    });
  });

  it("should handle chained member expressions", () => {
    ruleTester.run("prefer-bind", rule, {
      valid: [],
      invalid: [
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
      ],
    });
  });

  it("should respect onlyInLongLivedContexts option", () => {
    ruleTester.run("prefer-bind", rule, {
      valid: [
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
        {
          code: "signal.addEventListener('abort', () => controller.abort())",
          options: [{ onlyInLongLivedContexts: true }],
          errors: [{ messageId: "preferBind" }],
        },
        {
          code: "setTimeout(() => obj.cleanup(), 1000)",
          options: [{ onlyInLongLivedContexts: true }],
          errors: [{ messageId: "preferBind" }],
        },
      ],
    });
  });

  it("should allow custom longLivedContexts", () => {
    ruleTester.run("prefer-bind", rule, {
      valid: [],
      invalid: [
        {
          code: "myCustomHandler(() => obj.method())",
          options: [
            {
              onlyInLongLivedContexts: true,
              longLivedContexts: ["myCustomHandler"],
            },
          ],
          errors: [{ messageId: "preferBind" }],
        },
      ],
    });
  });
});
