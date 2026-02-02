import preferBind from "./lib/index.js";

export default [
  {
    plugins: {
      "prefer-bind": preferBind,
    },
    rules: {
      "prefer-bind/prefer-bind": "warn",
    },
  },
];
