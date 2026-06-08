/**
 * classes-importer.mjs
 *
 * Importa as 10 classes do Excel para um compendium World-side.
 * Idempotente via setting.
 */

const BUNDLE_PATH = "systems/pokemon-rpg/data/classes-bundle.json";
const PACK_NAME   = "pokemon-rpg-classes";
const PACK_LABEL  = "Pokémon RPG · Classes";
const SETTING_KEY = "classesBundleVersion";
const CURRENT_BUNDLE_VERSION = "0.2.0";

export function registerClassImporterSettings() {
  game.settings.register("pokemon-rpg", SETTING_KEY, {
    name: "POKEMON_RPG.Setting.ClassesBundleVersion.Name",
    hint: "POKEMON_RPG.Setting.ClassesBundleVersion.Hint",
    scope: "world", config: false, type: String, default: ""
  });
}

export async function importClassesIfNeeded() {
  if ( !game.user?.isGM ) return;
  const installedVersion = game.settings.get("pokemon-rpg", SETTING_KEY);
  if ( installedVersion === CURRENT_BUNDLE_VERSION ) return;
  console.log(`pokemon-rpg | Importando classes (bundle ${CURRENT_BUNDLE_VERSION})...`);

  let bundle;
  try {
    const resp = await fetch(BUNDLE_PATH);
    if ( !resp.ok ) throw new Error(`HTTP ${resp.status}`);
    bundle = await resp.json();
  } catch (err) {
    console.error("pokemon-rpg | falha ao carregar classes-bundle.json:", err);
    ui.notifications?.error("Pokémon RPG: falha ao carregar bundle de classes.");
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

  try {
    const created = await Item.createDocuments(bundle, { pack: pack.collection });
    await game.settings.set("pokemon-rpg", SETTING_KEY, CURRENT_BUNDLE_VERSION);
    ui.notifications?.info(`Pokémon RPG: ${created.length} classe(s) importada(s).`);
  } catch (err) {
    console.error("pokemon-rpg | erro ao importar classes:", err);
  }
}

async function importAsWorldItems(bundle) {
  let folder = game.folders.find(f => f.name === PACK_LABEL && f.type === "Item");
  if ( !folder ) folder = await Folder.create({ name: PACK_LABEL, type: "Item", color: "#EE1515" });
  const data = bundle.map(d => ({ ...d, folder: folder.id }));
  const old = game.items.filter(i => i.folder?.id === folder.id);
  if ( old.length ) await Item.deleteDocuments(old.map(i => i.id));
  const created = await Item.createDocuments(data);
  await game.settings.set("pokemon-rpg", SETTING_KEY, CURRENT_BUNDLE_VERSION);
  ui.notifications?.info(`Pokémon RPG: ${created.length} classe(s) importada(s) como itens do mundo.`);
}

export async function forceReimportClasses() {
  await game.settings.set("pokemon-rpg", SETTING_KEY, "");
  return importClassesIfNeeded();
}
