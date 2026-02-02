import preferBind from "./rules/prefer-bind.js";

const plugin = {
  meta: {
    name: "eslint-plugin-prefer-bind",
    version: "0.1.0",
  },
  rules: {
    "prefer-bind": preferBind,
  },
};

export default plugin;
