/**
 * items-importer.mjs
 *
 * Auto-import dos itens genéricos (poções, pokébolas, suplementos etc.)
 * para um compendium world-side.
 */

const BUNDLE_URL  = "systems/pokemon-rpg/data/items-bundle.json";
const PACK_ID     = "world.pokemon-rpg-items";
const PACK_LABEL  = "Pokémon RPG · Itens";
const SETTING_KEY = "itemsBundleVersion";
const CURRENT_BUNDLE_VERSION = "0.1.0";

export function registerItemImporterSettings() {
  game.settings.register("pokemon-rpg", SETTING_KEY, {
    name: "POKEMON_RPG.Setting.ItemsBundleVersion.Name",
    hint: "POKEMON_RPG.Setting.ItemsBundleVersion.Hint",
    scope: "world",
    config: false,
    type: String,
    default: ""
  });
}

export async function importItemsIfNeeded() {
  if ( !game.user?.isGM ) return;
  const installedVersion = game.settings.get("pokemon-rpg", SETTING_KEY);
  if ( installedVersion === CURRENT_BUNDLE_VERSION ) return;

  console.log(`pokemon-rpg | Importando itens (bundle ${CURRENT_BUNDLE_VERSION})...`);
  const data = await foundry.utils.fetchJsonWithTimeout(BUNDLE_URL);
  if ( !Array.isArray(data) ) {
    console.warn("pokemon-rpg | items-bundle.json em formato inesperado.");
    return;
  }

  // Garante compendium world-side.
  let pack = game.packs.get(PACK_ID);
  if ( !pack ) {
    pack = await foundry.documents.collections.CompendiumCollection.createCompendium({
      label: PACK_LABEL,
      type: "Item",
      name: "pokemon-rpg-items",
      package: "world",
      system: "pokemon-rpg"
    });
  }
  // Apaga conteúdo atual do pack (idempotente).
  try {
    const existing = await pack.getDocuments();
    if ( existing.length ) {
      await Item.deleteDocuments(existing.map(d => d.id), { pack: PACK_ID });
    }
  } catch (err) {
    console.warn("pokemon-rpg | falha ao limpar pack de itens:", err);
  }
  // Cria em lotes pra não estourar memória.
  const BATCH = 50;
  for ( let i = 0; i < data.length; i += BATCH ) {
    const slice = data.slice(i, i + BATCH);
    await Item.createDocuments(slice, { pack: PACK_ID });
  }
  await game.settings.set("pokemon-rpg", SETTING_KEY, CURRENT_BUNDLE_VERSION);
  ui.notifications?.info(`Importados ${data.length} itens para o compendium "${PACK_LABEL}".`);
}

export async function forceReimportItems() {
  await game.settings.set("pokemon-rpg", SETTING_KEY, "");
  return importItemsIfNeeded();
}
