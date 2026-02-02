import preferBind from "./rules/prefer-bind.js";

const plugin = {
  meta: {
    name: "@kawaz/eslint-plugin-prefer-bind",
    version: "0.1.1",
  },
  rules: {
    "prefer-bind": preferBind,
  },
};

export default plugin;
