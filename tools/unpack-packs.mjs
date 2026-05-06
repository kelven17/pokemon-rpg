/**
 * unpack-packs.mjs
 *
 * Operação inversa: descompila packs/<pack>/ (LevelDB)
 * de volta para packs/_source/<pack>/*.json — útil quando
 * você editou no Foundry e quer versionar as mudanças.
 *
 * Uso:
 *   npm run unpack:packs
 */

import { extractPack } from "@foundryvtt/foundryvtt-cli";
import { readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SYSTEM_ROOT = join(__dirname, "..");
const SOURCE_DIR = join(SYSTEM_ROOT, "packs", "_source");
const PACKS_DIR  = join(SYSTEM_ROOT, "packs");

const packs = readdirSync(PACKS_DIR).filter((name) => {
  if ( name === "_source" ) return false;
  const path = join(PACKS_DIR, name);
  return statSync(path).isDirectory();
});

console.log(`Extracting ${packs.length} packs to ${SOURCE_DIR}`);

for ( const pack of packs ) {
  const srcPath = join(PACKS_DIR, pack);
  const destPath = join(SOURCE_DIR, pack);
  console.log(`  → ${pack} (${srcPath} → ${destPath})`);
  await extractPack(srcPath, destPath, { yaml: false });
}

console.log("Done.");
