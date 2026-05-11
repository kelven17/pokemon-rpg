/**
 * abilities-importer.mjs
 *
 * Importa todas as habilidades de `data/abilities-bundle.json` para o mundo
 * do usuário, criando um compendium World-side chamado "pokemon-rpg-abilities"
 * e populando-o com cada habilidade como um Item do tipo "ability".
 *
 * Idempotente via setting `abilitiesBundleVersion`. Reusa o mesmo fallback
 * para itens de mundo caso a criação do compendium falhe.
 */

const BUNDLE_PATH = "systems/pokemon-rpg/data/abilities-bundle.json";
const PACK_NAME   = "pokemon-rpg-abilities";
const PACK_LABEL  = "Pokémon RPG · Habilidades";
const SETTING_KEY = "abilitiesBundleVersion";
const CURRENT_BUNDLE_VERSION = "0.2.0";

export function registerAbilityImporterSettings() {
  game.settings.register("pokemon-rpg", SETTING_KEY, {
    name: "POKEMON_RPG.Setting.AbilitiesBundleVersion.Name",
    hint: "POKEMON_RPG.Setting.AbilitiesBundleVersion.Hint",
    scope: "world",
    config: false,
    type: String,
    default: ""
  });
}

export async function importAbilitiesIfNeeded() {
  if ( !game.user?.isGM ) return;

  const installedVersion = game.settings.get("pokemon-rpg", SETTING_KEY);
  if ( installedVersion === CURRENT_BUNDLE_VERSION ) return;

  console.log(`pokemon-rpg | Iniciando import de habilidades (bundle ${CURRENT_BUNDLE_VERSION})...`);

  // 1. Carrega o bundle
  let bundle;
  try {
    const resp = await fetch(BUNDLE_PATH);
    if ( !resp.ok ) throw new Error(`HTTP ${resp.status}`);
    bundle = await resp.json();
  } catch (err) {
    console.error("pokemon-rpg | falha ao carregar abilities-bundle.json:", err);
    ui.notifications?.error("Pokémon RPG: falha ao carregar bundle de habilidades.");
    return;
  }

  if ( !Array.isArray(bundle) || bundle.length === 0 ) {
    console.warn("pokemon-rpg | bundle de habilidades vazio.");
    return;
  }

  // 2. Pega/cria o compendium World-side
  const fullCollection = `world.${PACK_NAME}`;
  let pack = game.packs.get(fullCollection);
  if ( !pack ) {
    try {
      pack = await CompendiumCollection.createCompendium({
        name: PACK_NAME,
        label: PACK_LABEL,
        type: "Item",
        system: "pokemon-rpg",
        package: "world"
      });
      console.log(`pokemon-rpg | Compendium criado: ${PACK_LABEL}`);
    } catch (err) {
      console.error("pokemon-rpg | falha ao criar compendium:", err);
      return importAsWorldItems(bundle);
    }
  }

  // 3. Limpa entradas anteriores
  try {
    const existing = await pack.getDocuments();
    if ( existing.length > 0 ) {
      await Item.deleteDocuments(existing.map(d => d.id), { pack: pack.collection });
      console.log(`pokemon-rpg | ${existing.length} habilidades antigas removidas`);
    }
  } catch (err) {
    console.warn("pokemon-rpg | aviso ao limpar compendium antigo:", err);
  }

  // 4. Cria todas as habilidades em lotes
  const BATCH = 100;
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
  ui.notifications?.info(`Pokémon RPG: ${total} habilidade(s) importada(s) para "${PACK_LABEL}".`);
  console.log(`pokemon-rpg | Import de habilidades concluído: ${total} itens.`);
}

async function importAsWorldItems(bundle) {
  let folder = game.folders.find(f => f.name === PACK_LABEL && f.type === "Item");
  if ( !folder ) {
    folder = await Folder.create({ name: PACK_LABEL, type: "Item", color: "#3B4CCA" });
  }
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
  ui.notifications?.info(`Pokémon RPG: ${total} habilidade(s) importada(s) como itens do mundo.`);
}

export async function forceReimportAbilities() {
  await game.settings.set("pokemon-rpg", SETTING_KEY, "");
  return importAbilitiesIfNeeded();
}
