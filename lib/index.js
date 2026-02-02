import preferBind from "./rules/prefer-bind.js";

const plugin = {
  meta: {
    name: "@kawaz/eslint-plugin-prefer-bind",
    version: "0.1.5",
  },
  rules: {
    "prefer-bind": preferBind,
  },
};

export default plugin;
