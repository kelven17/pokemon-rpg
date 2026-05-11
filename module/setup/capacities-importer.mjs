/**
 * capacities-importer.mjs
 *
 * Importa todas as capacidades de `data/capacities-bundle.json` para o mundo
 * do usuário, criando um compendium World-side chamado "pokemon-rpg-capacities".
 *
 * Idempotente via setting `capacitiesBundleVersion`.
 */

const BUNDLE_PATH = "systems/pokemon-rpg/data/capacities-bundle.json";
const PACK_NAME   = "pokemon-rpg-capacities";
const PACK_LABEL  = "Pokémon RPG · Capacidades";
const SETTING_KEY = "capacitiesBundleVersion";
const CURRENT_BUNDLE_VERSION = "0.1.0";

export function registerCapacityImporterSettings() {
  game.settings.register("pokemon-rpg", SETTING_KEY, {
    name: "POKEMON_RPG.Setting.CapacitiesBundleVersion.Name",
    hint: "POKEMON_RPG.Setting.CapacitiesBundleVersion.Hint",
    scope: "world",
    config: false,
    type: String,
    default: ""
  });
}

export async function importCapacitiesIfNeeded() {
  if ( !game.user?.isGM ) return;
  const installedVersion = game.settings.get("pokemon-rpg", SETTING_KEY);
  if ( installedVersion === CURRENT_BUNDLE_VERSION ) return;

  console.log(`pokemon-rpg | Importando capacidades (bundle ${CURRENT_BUNDLE_VERSION})...`);

  let bundle;
  try {
    const resp = await fetch(BUNDLE_PATH);
    if ( !resp.ok ) throw new Error(`HTTP ${resp.status}`);
    bundle = await resp.json();
  } catch (err) {
    console.error("pokemon-rpg | falha ao carregar capacities-bundle.json:", err);
    ui.notifications?.error("Pokémon RPG: falha ao carregar bundle de capacidades.");
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
      console.log(`pokemon-rpg | Compendium criado: ${PACK_LABEL}`);
    } catch (err) {
      console.error("pokemon-rpg | falha ao criar compendium:", err);
      return importAsWorldItems(bundle);
    }
  }

  try {
    const existing = await pack.getDocuments();
    if ( existing.length > 0 ) {
      await Item.deleteDocuments(existing.map(d => d.id), { pack: pack.collection });
    }
  } catch (err) { console.warn(err); }

  const BATCH = 50;
  let total = 0;
  for ( let i = 0; i < bundle.length; i += BATCH ) {
    const slice = bundle.slice(i, i + BATCH);
    try {
      const created = await Item.createDocuments(slice, { pack: pack.collection });
      total += created.length;
    } catch (err) {
      console.error(`pokemon-rpg | erro no lote ${i}:`, err);
    }
  }
  await game.settings.set("pokemon-rpg", SETTING_KEY, CURRENT_BUNDLE_VERSION);
  ui.notifications?.info(`Pokémon RPG: ${total} capacidade(s) importada(s).`);
}

async function importAsWorldItems(bundle) {
  let folder = game.folders.find(f => f.name === PACK_LABEL && f.type === "Item");
  if ( !folder ) folder = await Folder.create({ name: PACK_LABEL, type: "Item", color: "#FFCB05" });
  const data = bundle.map(d => ({ ...d, folder: folder.id }));
  const old = game.items.filter(i => i.folder?.id === folder.id);
  if ( old.length ) await Item.deleteDocuments(old.map(i => i.id));
  const BATCH = 50;
  let total = 0;
  for ( let i = 0; i < data.length; i += BATCH ) {
    const created = await Item.createDocuments(data.slice(i, i + BATCH));
    total += created.length;
  }
  await game.settings.set("pokemon-rpg", SETTING_KEY, CURRENT_BUNDLE_VERSION);
  ui.notifications?.info(`Pokémon RPG: ${total} capacidade(s) importada(s) como itens do mundo.`);
}

export async function forceReimportCapacities() {
  await game.settings.set("pokemon-rpg", SETTING_KEY, "");
  return importCapacitiesIfNeeded();
}
