import { defineConfig } from "eslint/config";
import next from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...next,
  { ignores: [".next_old/**"] },
]);

export default eslintConfig;
