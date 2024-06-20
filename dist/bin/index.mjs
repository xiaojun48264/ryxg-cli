#!/usr/bin/env node
import jiti from "file:///F:/project/ryxg-cli/node_modules/.pnpm/jiti@1.21.3/node_modules/jiti/lib/index.js";

/** @type {import("F:/project/ryxg-cli/src/bin/index")} */
const _module = jiti(null, {
  "esmResolve": true,
  "interopDefault": true,
  "alias": {
    "@ryxg/cli": "F:/project/ryxg-cli",
    "@": "F:\\project\\ryxg-cli\\src\\"
  }
})("F:/project/ryxg-cli/src/bin/index.ts");

export default _module;