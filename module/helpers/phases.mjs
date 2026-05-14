/**
 * phases.mjs — utilitários para controlar a Fase dos atributos.
 *
 * Cada atributo tem um campo `phase` (-6 a +6, default 0). O valor real
 * (`value`) nunca muda; o multiplicador é aplicado no `mod` derivado pelo
 * prepareDerivedData de cada actor.
 */

const ATTR_KEYS = ["hp", "atk", "def", "spa", "spd", "spe"];

/**
 * Altera a fase de um atributo em delta (+1/-1), clamping em [-6, +6].
 */
export async function changePhase(actor, attrKey, delta) {
  if ( !actor || !attrKey ) return;
  if ( !ATTR_KEYS.includes(attrKey) ) return;
  const current = actor.system.attributes?.[attrKey]?.phase ?? 0;
  const next = Math.max(-6, Math.min(6, current + (Number(delta) || 0)));
  if ( next === current ) return;
  await actor.update({ [`system.attributes.${attrKey}.phase`]: next });
}

/**
 * Define a fase de um atributo para um valor específico.
 */
export async function setPhase(actor, attrKey, value) {
  if ( !actor || !attrKey ) return;
  if ( !ATTR_KEYS.includes(attrKey) ) return;
  const clamped = Math.max(-6, Math.min(6, Number(value) || 0));
  await actor.update({ [`system.attributes.${attrKey}.phase`]: clamped });
}

/**
 * Zera todas as fases do ator de uma vez (útil para "fim de encontro").
 */
export async function resetAllPhases(actor) {
  if ( !actor ) return;
  const updates = {};
  for ( const k of ATTR_KEYS ) {
    updates[`system.attributes.${k}.phase`] = 0;
  }
  await actor.update(updates);
  ui.notifications?.info("Pokémon RPG: Fases zeradas.");
}

// Export como objeto também para uso direto em action handlers estáticos.
export const PokemonSheetPhaseHelpers = {
  changePhase, setPhase, resetAllPhases
};
