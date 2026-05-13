/**
 * species-importer.mjs
 *
 * Importa todas as espécies de `data/species-bundle.json` para um compendium
 * World-side. Idempotente via setting `speciesBundleVersion`.
 */

const BUNDLE_PATH = "systems/pokemon-rpg/data/species-bundle.json";
const PACK_NAME   = "pokemon-rpg-species";
const PACK_LABEL  = "Pokémon RPG · Espécies";
const SETTING_KEY = "speciesBundleVersion";
const CURRENT_BUNDLE_VERSION = "0.1.0";

export function registerSpeciesImporterSettings() {
  game.settings.register("pokemon-rpg", SETTING_KEY, {
    name: "POKEMON_RPG.Setting.SpeciesBundleVersion.Name",
    hint: "POKEMON_RPG.Setting.SpeciesBundleVersion.Hint",
    scope: "world",
    config: false,
    type: String,
    default: ""
  });
}

export async function importSpeciesIfNeeded() {
  if ( !game.user?.isGM ) return;
  const installedVersion = game.settings.get("pokemon-rpg", SETTING_KEY);
  if ( installedVersion === CURRENT_BUNDLE_VERSION ) return;

  console.log(`pokemon-rpg | Importando espécies (bundle ${CURRENT_BUNDLE_VERSION})...`);

  let bundle;
  try {
    const resp = await fetch(BUNDLE_PATH);
    if ( !resp.ok ) throw new Error(`HTTP ${resp.status}`);
    bundle = await resp.json();
  } catch (err) {
    console.error("pokemon-rpg | falha ao carregar species-bundle.json:", err);
    ui.notifications?.error("Pokémon RPG: falha ao carregar bundle de espécies.");
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

  const BATCH = 100;
  let total = 0;
  for ( let i = 0; i < bundle.length; i += BATCH ) {
    const slice = bundle.slice(i, i + BATCH);
    try {
      const created = await Item.createDocuments(slice, { pack: pack.collection });
      total += created.length;
      if ( i % 200 === 0 ) {
        ui.notifications?.info(`Pokémon RPG: importando espécies... ${total}/${bundle.length}`);
      }
    } catch (err) {
      console.error(`pokemon-rpg | erro no lote ${i}:`, err);
    }
  }
  await game.settings.set("pokemon-rpg", SETTING_KEY, CURRENT_BUNDLE_VERSION);
  ui.notifications?.info(`Pokémon RPG: ${total} espécie(s) importada(s).`);
}

async function importAsWorldItems(bundle) {
  let folder = game.folders.find(f => f.name === PACK_LABEL && f.type === "Item");
  if ( !folder ) folder = await Folder.create({ name: PACK_LABEL, type: "Item", color: "#FFCB05" });
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
  ui.notifications?.info(`Pokémon RPG: ${total} espécie(s) importada(s) como itens do mundo.`);
}

export async function forceReimportSpecies() {
  await game.settings.set("pokemon-rpg", SETTING_KEY, "");
  return importSpeciesIfNeeded();
}
