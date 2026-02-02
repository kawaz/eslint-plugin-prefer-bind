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

    /**
     * Check if a node is a simple method call: obj.method()
     * Returns { object, method } if it matches, null otherwise
     */
    function getSimpleMethodCall(node) {
      if (
        node.type === "CallExpression" &&
        node.callee.type === "MemberExpression" &&
        node.arguments.length === 0 &&
        !node.callee.computed
      ) {
        const callee = node.callee;
        if (callee.property.type === "Identifier") {
          return {
            object: callee.object,
            method: callee.property.name,
          };
        }
      }
      return null;
    }

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
     * Get source text for a node
     */
    function getSourceText(node) {
      return context.sourceCode.getText(node);
    }

    /**
     * Check if it's a simple arrow function: () => expr
     */
    function checkArrowFunction(node) {
      // Must be: () => obj.method()
      if (node.params.length !== 0) return;
      if (node.async) return;

      const body = node.body;
      let callExpr;

      if (body.type === "CallExpression") {
        // () => obj.method()
        callExpr = body;
      } else if (
        body.type === "BlockStatement" &&
        body.body.length === 1 &&
        body.body[0].type === "ExpressionStatement" &&
        body.body[0].expression.type === "CallExpression"
      ) {
        // () => { obj.method(); }
        callExpr = body.body[0].expression;
      } else {
        return;
      }

      const methodCall = getSimpleMethodCall(callExpr);
      if (!methodCall) return;

      if (onlyInLongLivedContexts && !isInLongLivedContext(node)) {
        return;
      }

      const objectText = getSourceText(methodCall.object);
      const replacement = `${objectText}.${methodCall.method}.bind(${objectText})`;

      context.report({
        node,
        messageId: "preferBind",
        data: { replacement },
        suggest: [
          {
            messageId: "preferBindSuggestion",
            fix(fixer) {
              return fixer.replaceText(node, replacement);
            },
          },
        ],
      });
    }

    /**
     * Check if it's a simple function expression: function() { obj.method(); }
     */
    function checkFunctionExpression(node) {
      if (node.params.length !== 0) return;
      if (node.async) return;
      if (node.generator) return;

      const body = node.body;
      if (body.type !== "BlockStatement") return;
      if (body.body.length !== 1) return;

      const stmt = body.body[0];
      if (stmt.type !== "ExpressionStatement") return;
      if (stmt.expression.type !== "CallExpression") return;

      const methodCall = getSimpleMethodCall(stmt.expression);
      if (!methodCall) return;

      if (onlyInLongLivedContexts && !isInLongLivedContext(node)) {
        return;
      }

      const objectText = getSourceText(methodCall.object);
      const replacement = `${objectText}.${methodCall.method}.bind(${objectText})`;

      context.report({
        node,
        messageId: "preferBind",
        data: { replacement },
        suggest: [
          {
            messageId: "preferBindSuggestion",
            fix(fixer) {
              return fixer.replaceText(node, replacement);
            },
          },
        ],
      });
    }

    return {
      ArrowFunctionExpression: checkArrowFunction,
      FunctionExpression: checkFunctionExpression,
    };
  },
};

export default rule;
