import preferBind from "@kawaz/eslint-plugin-prefer-bind";

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
