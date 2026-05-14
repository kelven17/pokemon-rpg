/**
 * learn-moves.mjs — auto-aprendizado de golpes ao subir de nível.
 *
 * Quando o nível de um Pokémon aumenta, busca os golpes da `learnset` da
 * espécie que se tornaram disponíveis na faixa de níveis e os adiciona como
 * items embeddados no actor (sem duplicar golpes já presentes).
 */

import { findItemsByName } from "./compendium-lookup.mjs";

/**
 * Adiciona golpes naturais aprendidos no intervalo (oldLevel, newLevel].
 *
 * @param {Actor}   actor      o Pokémon
 * @param {number}  newLevel   nível depois da mudança
 * @param {number}  oldLevel   nível antes da mudança
 * @returns {number}           quantidade de golpes adicionados
 */
export async function learnMovesForLevelRange(actor, newLevel, oldLevel) {
  if ( !actor || actor.type !== "pokemon" ) return 0;
  if ( newLevel <= oldLevel ) return 0;

  // 1. Pega a espécie referenciada
  const speciesUuid = actor.system.species?.uuid;
  if ( !speciesUuid ) return 0;
  let species;
  try {
    species = await fromUuid(speciesUuid);
  } catch (err) {
    console.warn("pokemon-rpg | falha ao carregar espécie pra aprender golpes:", err);
    return 0;
  }
  if ( !species || species.type !== "species" ) return 0;

  const learnset = species.system?.learnset ?? [];
  if ( !learnset.length ) return 0;

  // 2. Filtra golpes naturais (trigger=level) cujo nível está no range
  //    (oldLevel, newLevel], evitando duplicatas com golpes que o pokémon
  //    já possui.
  const existingMoveNames = new Set(
    actor.items.filter(i => i.type === "move")
               .map(i => String(i.name).trim().toLowerCase())
  );
  const toLearn = new Set();
  for ( const entry of learnset ) {
    const lvl = Number(entry.level) || 0;
    const trg = entry.trigger ?? "level";
    if ( trg !== "level" ) continue;
    if ( lvl <= oldLevel || lvl > newLevel ) continue;
    if ( !entry.move ) continue;
    const norm = String(entry.move).trim().toLowerCase();
    if ( existingMoveNames.has(norm) ) continue;
    toLearn.add(entry.move);
  }
  if ( toLearn.size === 0 ) return 0;

  // 3. Procura nos compendiums + cria como items embeddados
  const items = await findItemsByName("move", [...toLearn]);
  if ( !items.length ) return 0;

  await actor.createEmbeddedDocuments("Item", items);

  // 4. Notifica
  const names = items.map(i => i.name).join(", ");
  ui.notifications?.info(
    `${actor.name} aprendeu ${items.length} golpe(s): ${names}`
  );
  return items.length;
}
