#!/usr/bin/env node
import jiti from "file:///G:/project/ryxg-cli/node_modules/.pnpm/jiti@1.21.3/node_modules/jiti/lib/index.js";

/** @type {import("G:/project/ryxg-cli/src/bin/index")} */
const _module = jiti(null, {
  "esmResolve": true,
  "interopDefault": true,
  "alias": {
    "@ryxg/cli": "G:/project/ryxg-cli",
    "@": "G:\\project\\ryxg-cli\\src\\"
  }
})("G:/project/ryxg-cli/src/bin/index.ts");

export default _module;