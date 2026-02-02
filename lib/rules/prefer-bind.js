/**
 * @fileoverview Prefer .bind() over closure wrappers for simple method calls
 *
 * Detects patterns like:
 *   () => obj.method()
 *   function() { obj.method() }
 *
 * And suggests:
 *   obj.method.bind(obj)
 *
 * This helps prevent memory leaks when closures are stored in long-lived contexts,
 * as closures capture the entire surrounding scope while .bind() only retains
 * a reference to the object.
 */

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Prefer .bind() over closure wrappers to prevent potential memory leaks",
      recommended: false,
    },
    fixable: "code",
    hasSuggestions: true,
    schema: [
      {
        type: "object",
        properties: {
          // Only warn when passed to specific functions known to hold references long-term
          onlyInLongLivedContexts: {
            type: "boolean",
            default: false,
          },
          // Functions that are known to hold callbacks long-term
          longLivedContexts: {
            type: "array",
            items: { type: "string" },
            default: [
              "addEventListener",
              "setTimeout",
              "setInterval",
              "on",
              "once",
              "subscribe",
            ],
          },
          // Include async functions (warning only, no auto-fix since behavior may differ)
          includeAsync: {
            type: "boolean",
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      preferBind:
        "Prefer '{{replacement}}' over closure wrapper to avoid capturing surrounding scope.",
      preferBindSuggestion: "Replace with .bind()",
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const onlyInLongLivedContexts = options.onlyInLongLivedContexts || false;
    const longLivedContexts = options.longLivedContexts || [
      "addEventListener",
      "setTimeout",
      "setInterval",
      "on",
      "once",
      "subscribe",
    ];
    const includeAsync = options.includeAsync || false;

    /**
     * Check if a node is a method call: obj.method() or obj.method(args)
     * Returns { object, method, arguments } if it matches, null otherwise
     */
    function getMethodCall(node, allowArgs = false) {
      if (
        node.type === "CallExpression" &&
        node.callee.type === "MemberExpression" &&
        !node.callee.computed
      ) {
        if (!allowArgs && node.arguments.length > 0) {
          return null;
        }
        const callee = node.callee;
        if (callee.property.type === "Identifier") {
          return {
            object: callee.object,
            method: callee.property.name,
            arguments: node.arguments,
          };
        }
      }
      return null;
    }

    /**
     * Check if a node is a simple method call with no arguments: obj.method()
     */
    function getSimpleMethodCall(node) {
      return getMethodCall(node, false);
    }

    // Functions that support passing arguments after the delay parameter
    const timerFunctions = ["setTimeout", "setInterval"];

    /**
     * Check if the function is passed to a long-lived context
     */
    function isInLongLivedContext(node) {
      const parent = node.parent;
      if (parent.type === "CallExpression" && parent.arguments.includes(node)) {
        const callee = parent.callee;
        if (callee.type === "Identifier") {
          return longLivedContexts.includes(callee.name);
        }
        if (
          callee.type === "MemberExpression" &&
          callee.property.type === "Identifier"
        ) {
          return longLivedContexts.includes(callee.property.name);
        }
      }
      return false;
    }

    /**
     * Check if the function is the first argument of setTimeout/setInterval
     * Returns { name, parent, callbackIndex, delayArg } if true, null otherwise
     */
    function getTimerContext(node) {
      const parent = node.parent;
      if (parent.type !== "CallExpression") return null;
      if (parent.arguments[0] !== node) return null;

      const callee = parent.callee;
      let name;
      if (callee.type === "Identifier") {
        name = callee.name;
      } else if (
        callee.type === "MemberExpression" &&
        callee.property.type === "Identifier"
      ) {
        name = callee.property.name;
      } else {
        return null;
      }

      if (!timerFunctions.includes(name)) return null;

      return {
        name,
        parent,
        callbackIndex: 0,
        delayArg: parent.arguments[1] || null,
      };
    }

    /**
     * Get source text for a node
     */
    function getSourceText(node) {
      return context.sourceCode.getText(node);
    }

    /**
     * Report a prefer-bind violation
     */
    function reportPreferBind(node, methodCall, timerContext) {
      const objectText = getSourceText(methodCall.object);
      const bindExpr = `${objectText}.${methodCall.method}.bind(${objectText})`;

      // For timer functions with arguments, we need to move args after the delay
      if (timerContext && methodCall.arguments.length > 0) {
        const argsText = methodCall.arguments.map(getSourceText).join(", ");
        const delayText = timerContext.delayArg
          ? getSourceText(timerContext.delayArg)
          : "0";
        const replacement = `${timerContext.name}(${bindExpr}, ${delayText}, ${argsText})`;

        context.report({
          node: timerContext.parent,
          messageId: "preferBind",
          data: { replacement },
          suggest: [
            {
              messageId: "preferBindSuggestion",
              fix(fixer) {
                return fixer.replaceText(timerContext.parent, replacement);
              },
            },
          ],
        });
      } else {
        context.report({
          node,
          messageId: "preferBind",
          data: { replacement: bindExpr },
          suggest: [
            {
              messageId: "preferBindSuggestion",
              fix(fixer) {
                return fixer.replaceText(node, bindExpr);
              },
            },
          ],
        });
      }
    }

    /**
     * Check if it's a simple arrow function: () => expr
     */
    function checkArrowFunction(node) {
      // Must be: () => obj.method() or () => obj.method(args) in timer context
      if (node.params.length !== 0) return;

      const isAsync = node.async;
      if (isAsync && !includeAsync) return;

      const body = node.body;
      let callExpr;

      if (body.type === "CallExpression") {
        // () => obj.method()
        callExpr = body;
      } else if (body.type === "AwaitExpression" && body.argument.type === "CallExpression") {
        // async () => await obj.method()
        callExpr = body.argument;
      } else if (
        body.type === "BlockStatement" &&
        body.body.length === 1 &&
        body.body[0].type === "ExpressionStatement"
      ) {
        const expr = body.body[0].expression;
        if (expr.type === "CallExpression") {
          // () => { obj.method(); }
          callExpr = expr;
        } else if (expr.type === "AwaitExpression" && expr.argument.type === "CallExpression") {
          // async () => { await obj.method(); }
          callExpr = expr.argument;
        } else {
          return;
        }
      } else {
        return;
      }

      // Check for timer context (setTimeout/setInterval) which allows args
      const timerContext = getTimerContext(node);
      const methodCall = getMethodCall(callExpr, !!timerContext);
      if (!methodCall) return;

      if (onlyInLongLivedContexts && !isInLongLivedContext(node) && !timerContext) {
        return;
      }

      reportPreferBind(node, methodCall, timerContext);
    }

    /**
     * Check if it's a simple function expression: function() { obj.method(); }
     */
    function checkFunctionExpression(node) {
      if (node.params.length !== 0) return;
      if (node.generator) return;

      const isAsync = node.async;
      if (isAsync && !includeAsync) return;

      const body = node.body;
      if (body.type !== "BlockStatement") return;
      if (body.body.length !== 1) return;

      const stmt = body.body[0];
      if (stmt.type !== "ExpressionStatement") return;

      let callExpr;
      if (stmt.expression.type === "CallExpression") {
        callExpr = stmt.expression;
      } else if (
        stmt.expression.type === "AwaitExpression" &&
        stmt.expression.argument.type === "CallExpression"
      ) {
        // async function() { await obj.method(); }
        callExpr = stmt.expression.argument;
      } else {
        return;
      }

      // Check for timer context (setTimeout/setInterval) which allows args
      const timerContext = getTimerContext(node);
      const methodCall = getMethodCall(callExpr, !!timerContext);
      if (!methodCall) return;

      if (onlyInLongLivedContexts && !isInLongLivedContext(node) && !timerContext) {
        return;
      }

      reportPreferBind(node, methodCall, timerContext);
    }

    return {
      ArrowFunctionExpression: checkArrowFunction,
      FunctionExpression: checkFunctionExpression,
    };
  },
};

export default rule;
