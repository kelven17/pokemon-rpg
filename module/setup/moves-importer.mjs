/**
 * moves-importer.mjs
 *
 * Importa todos os golpes de `data/moves-bundle.json` para o mundo do usuário,
 * criando um compendium World-side chamado "pokemon-rpg-moves" e populando-o
 * com cada golpe como um Item.
 *
 * Esse mecanismo evita a necessidade de rodar `npm run build:packs` localmente,
 * disponibilizando todos os golpes assim que o sistema é instalado.
 *
 * Idempotente: usa uma setting `movesBundleVersion` para evitar reimportar
 * a cada inicialização — só refaz o import se a versão do bundle mudou.
 */

import { POKEMON_RPG } from "../helpers/config.mjs";

const BUNDLE_PATH = "systems/pokemon-rpg/data/moves-bundle.json";
const PACK_NAME   = "pokemon-rpg-moves";   // nome interno do compendium
const PACK_LABEL  = "Pokémon RPG · Golpes";
const SETTING_KEY = "movesBundleVersion";
// Atualize este número quando regerar o bundle pra forçar reimport.
const CURRENT_BUNDLE_VERSION = "0.2.0";

/**
 * Registra a setting que rastreia a versão do bundle já importada.
 * Chamar em Hooks.once("init").
 */
export function registerMoveImporterSettings() {
  game.settings.register("pokemon-rpg", SETTING_KEY, {
    name: "POKEMON_RPG.Setting.MovesBundleVersion.Name",
    hint: "POKEMON_RPG.Setting.MovesBundleVersion.Hint",
    scope: "world",
    config: false,         // não aparece na tela de Settings (só interno)
    type: String,
    default: ""
  });
}

/**
 * Tenta importar os golpes. Chamar em Hooks.once("ready"), apenas para GM.
 * Operação assíncrona e pode demorar alguns segundos para 665+ itens.
 */
export async function importMovesIfNeeded() {
  if ( !game.user?.isGM ) return;

  const installedVersion = game.settings.get("pokemon-rpg", SETTING_KEY);
  if ( installedVersion === CURRENT_BUNDLE_VERSION ) {
    return; // já importado nesta versão
  }

  console.log(`pokemon-rpg | Iniciando import de golpes (bundle ${CURRENT_BUNDLE_VERSION})...`);

  // 1. Carrega o bundle
  let bundle;
  try {
    const resp = await fetch(BUNDLE_PATH);
    if ( !resp.ok ) throw new Error(`HTTP ${resp.status}`);
    bundle = await resp.json();
  } catch (err) {
    console.error("pokemon-rpg | falha ao carregar moves-bundle.json:", err);
    ui.notifications?.error("Pokémon RPG: falha ao carregar bundle de golpes. Veja o console.");
    return;
  }

  if ( !Array.isArray(bundle) || bundle.length === 0 ) {
    console.warn("pokemon-rpg | bundle vazio.");
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
      // Fallback: cria como itens de mundo numa Folder
      return importAsWorldItems(bundle);
    }
  }

  // 3. Limpa entradas anteriores antes de reimportar (evita duplicação)
  try {
    const existing = await pack.getDocuments();
    if ( existing.length > 0 ) {
      const ids = existing.map(d => d.id);
      await Item.deleteDocuments(ids, { pack: pack.collection });
      console.log(`pokemon-rpg | ${ids.length} itens antigos removidos do compendium`);
    }
  } catch (err) {
    console.warn("pokemon-rpg | aviso ao limpar compendium antigo:", err);
  }

  // 4. Cria todos os itens do bundle no compendium em lotes
  const BATCH_SIZE = 100;
  let total = 0;
  for ( let i = 0; i < bundle.length; i += BATCH_SIZE ) {
    const slice = bundle.slice(i, i + BATCH_SIZE);
    try {
      const created = await Item.createDocuments(slice, { pack: pack.collection });
      total += created.length;
    } catch (err) {
      console.error(`pokemon-rpg | erro no lote ${i}:`, err);
    }
  }

  await game.settings.set("pokemon-rpg", SETTING_KEY, CURRENT_BUNDLE_VERSION);
  ui.notifications?.info(`Pokémon RPG: ${total} golpe(s) importado(s) para o compendium "${PACK_LABEL}".`);
  console.log(`pokemon-rpg | Import concluído: ${total} itens.`);
}

/**
 * Fallback caso o sistema não permita criar compendium dinamicamente:
 * cria os itens como World items numa Folder.
 */
async function importAsWorldItems(bundle) {
  // Cria/reusa folder
  let folder = game.folders.find(f => f.name === PACK_LABEL && f.type === "Item");
  if ( !folder ) {
    folder = await Folder.create({
      name: PACK_LABEL,
      type: "Item",
      color: "#EE1515"
    });
  }
  // Adiciona folder.id em cada item
  const data = bundle.map(d => ({ ...d, folder: folder.id }));
  // Limpa itens antigos da pasta
  const old = game.items.filter(i => i.folder?.id === folder.id);
  if ( old.length ) {
    await Item.deleteDocuments(old.map(i => i.id));
  }
  // Cria em lotes
  const BATCH_SIZE = 100;
  let total = 0;
  for ( let i = 0; i < data.length; i += BATCH_SIZE ) {
    const slice = data.slice(i, i + BATCH_SIZE);
    const created = await Item.createDocuments(slice);
    total += created.length;
  }
  await game.settings.set("pokemon-rpg", SETTING_KEY, CURRENT_BUNDLE_VERSION);
  ui.notifications?.info(`Pokémon RPG: ${total} golpe(s) importado(s) como itens do mundo.`);
}

/**
 * Força reimport (útil para dev/testes ou após atualização do bundle).
 * Pode ser chamado via console: game.pokemonRpg.reimportMoves()
 */
export async function forceReimportMoves() {
  await game.settings.set("pokemon-rpg", SETTING_KEY, "");
  return importMovesIfNeeded();
}
