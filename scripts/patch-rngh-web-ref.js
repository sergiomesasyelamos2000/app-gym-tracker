/**
 * React 19 removed element.ref. RNGH 2.28 web utils still read node.ref and
 * spam console when GestureDetector wraps lists (DraggableFlatList).
 * Safe to re-run; no-ops if already patched or file missing.
 */
const fs = require("fs");
const path = require("path");

const targets = [
  path.join(
    __dirname,
    "..",
    "node_modules",
    "react-native-gesture-handler",
    "lib",
    "module",
    "web",
    "utils.js"
  ),
  path.join(
    __dirname,
    "..",
    "node_modules",
    "react-native-gesture-handler",
    "lib",
    "commonjs",
    "web",
    "utils.js"
  ),
];

const needle = "if (node.ref?.rngh)";
const replacement = "if (node?.props?.ref?.rngh)";

let patched = 0;
for (const file of targets) {
  if (!fs.existsSync(file)) continue;
  const source = fs.readFileSync(file, "utf8");
  if (!source.includes(needle)) {
    if (source.includes(replacement)) {
      continue;
    }
    continue;
  }
  fs.writeFileSync(file, source.replace(needle, replacement), "utf8");
  patched += 1;
}

if (patched > 0) {
  console.log(`[patch-rngh-web-ref] Patched ${patched} file(s) for React 19.`);
}
