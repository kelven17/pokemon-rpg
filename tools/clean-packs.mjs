/**
 * clean-packs.mjs
 *
 * Remove os diretórios LevelDB compilados (packs/<pack>/) — útil para
 * forçar uma recompilação limpa. NÃO toca em packs/_source/.
 */

import { readdirSync, rmSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SYSTEM_ROOT = join(__dirname, "..");
const PACKS_DIR  = join(SYSTEM_ROOT, "packs");

const packs = readdirSync(PACKS_DIR).filter((name) => {
  if ( name === "_source" ) return false;
  const path = join(PACKS_DIR, name);
  return statSync(path).isDirectory();
});

console.log(`Cleaning ${packs.length} compiled packs`);
for ( const pack of packs ) {
  const path = join(PACKS_DIR, pack);
  console.log(`  ✗ ${pack}`);
  rmSync(path, { recursive: true, force: true });
}
console.log("Done.");
