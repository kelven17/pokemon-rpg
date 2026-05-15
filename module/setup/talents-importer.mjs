/**
 * talents-importer.mjs
 *
 * Importa Talentos (geral + classe + característica) para um compendium
 * World-side. Idempotente via setting.
 */

const BUNDLE_PATH = "systems/pokemon-rpg/data/talents-bundle.json";
const PACK_NAME   = "pokemon-rpg-talents";
const PACK_LABEL  = "Pokémon RPG · Talentos";
const SETTING_KEY = "talentsBundleVersion";
const CURRENT_BUNDLE_VERSION = "0.1.0";

export function registerTalentImporterSettings() {
  game.settings.register("pokemon-rpg", SETTING_KEY, {
    name: "POKEMON_RPG.Setting.TalentsBundleVersion.Name",
    hint: "POKEMON_RPG.Setting.TalentsBundleVersion.Hint",
    scope: "world", config: false, type: String, default: ""
  });
}

export async function importTalentsIfNeeded() {
  if ( !game.user?.isGM ) return;
  const installedVersion = game.settings.get("pokemon-rpg", SETTING_KEY);
  if ( installedVersion === CURRENT_BUNDLE_VERSION ) return;
  console.log(`pokemon-rpg | Importando talentos (bundle ${CURRENT_BUNDLE_VERSION})...`);
  let bundle;
  try {
    const resp = await fetch(BUNDLE_PATH);
    if ( !resp.ok ) throw new Error(`HTTP ${resp.status}`);
    bundle = await resp.json();
  } catch (err) {
    console.error("pokemon-rpg | falha ao carregar talents-bundle.json:", err);
    ui.notifications?.error("Pokémon RPG: falha ao carregar bundle de talentos.");
    return;
  }
  if ( !Array.isArray(bundle) || bundle.length === 0 ) return;

  const fullCollection = `world.${PACK_NAME}`;
  let pack = game.packs.get(fullCollection);
  if ( !pack ) {
    try {
      pack = await CompendiumCollection.createCompendium({
        name: PACK_NAME, label: PACK_LABEL, type: "Item",
        system: "pokemon-rpg", package: "world"
      });
    } catch (err) {
      console.error("pokemon-rpg | falha ao criar compendium:", err);
      return importAsWorldItems(bundle);
    }
  }
  try {
    const existing = await pack.getDocuments();
    if ( existing.length ) await Item.deleteDocuments(existing.map(d => d.id), { pack: pack.collection });
  } catch (err) { console.warn(err); }
  const BATCH = 100;
  let total = 0;
  for ( let i = 0; i < bundle.length; i += BATCH ) {
    const slice = bundle.slice(i, i + BATCH);
    try {
      const created = await Item.createDocuments(slice, { pack: pack.collection });
      total += created.length;
    } catch (err) { console.error(`pokemon-rpg | erro no lote ${i}:`, err); }
  }
  await game.settings.set("pokemon-rpg", SETTING_KEY, CURRENT_BUNDLE_VERSION);
  ui.notifications?.info(`Pokémon RPG: ${total} talento(s) importado(s).`);
}

async function importAsWorldItems(bundle) {
  let folder = game.folders.find(f => f.name === PACK_LABEL && f.type === "Item");
  if ( !folder ) folder = await Folder.create({ name: PACK_LABEL, type: "Item", color: "#7C3AED" });
  const data = bundle.map(d => ({ ...d, folder: folder.id }));
  const old = game.items.filter(i => i.folder?.id === folder.id);
  if ( old.length ) await Item.deleteDocuments(old.map(i => i.id));
  const BATCH = 100;
  let total = 0;
  for ( let i = 0; i < data.length; i += BATCH ) {
    const created = await Item.createDocuments(data.slice(i, i + BATCH));
    total += created.length;
  }
  await game.settings.set("pokemon-rpg", SETTING_KEY, CURRENT_BUNDLE_VERSION);
}

export async function forceReimportTalents() {
  await game.settings.set("pokemon-rpg", SETTING_KEY, "");
  return importTalentsIfNeeded();
}
