import preferBind from "./rules/prefer-bind.js";

const plugin = {
  meta: {
    name: "prefer-bind",
    version: "0.1.3",
  },
  rules: {
    "prefer-bind": preferBind,
  },
};

export default plugin;
