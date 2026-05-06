/**
 * build-packs.mjs
 *
 * Compila os arquivos JSON em packs/_source/<pack>/*.json
 * para os compendiums LevelDB esperados pelo Foundry em packs/<pack>/.
 *
 * Requer @foundryvtt/foundryvtt-cli instalado:
 *   npm install
 *
 * Uso:
 *   npm run build:packs
 */

import { compilePack } from "@foundryvtt/foundryvtt-cli";
import { readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SYSTEM_ROOT = join(__dirname, "..");
const SOURCE_DIR = join(SYSTEM_ROOT, "packs", "_source");
const PACKS_DIR  = join(SYSTEM_ROOT, "packs");

const packs = readdirSync(SOURCE_DIR).filter((name) => {
  const path = join(SOURCE_DIR, name);
  return statSync(path).isDirectory();
});

console.log(`Compiling ${packs.length} packs from ${SOURCE_DIR}`);

for ( const pack of packs ) {
  const srcPath = join(SOURCE_DIR, pack);
  const destPath = join(PACKS_DIR, pack);
  console.log(`  → ${pack} (${srcPath} → ${destPath})`);
  await compilePack(srcPath, destPath, { yaml: false, recursive: true });
}

console.log("Done.");
