/**
 * Classe customizada de Actor.
 * Praticamente toda lógica vive no DataModel — esta classe apenas roteia.
 */
export class PokemonActor extends Actor {

  /** @override */
  prepareData() {
    super.prepareData();
  }

  /** @override */
  prepareBaseData() {
    super.prepareBaseData();
  }

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    // O system DataModel já tem prepareDerivedData() definido.
    // Foundry chama automaticamente, mas reforçamos aqui caso herdeiros precisem.
  }

  /**
   * Helper público para rolar uma perícia (treinador).
   */
  async rollSkill(skillKey, options = {}) {
    if ( this.type !== "trainer" ) {
      ui.notifications?.warn(game.i18n.localize("POKEMON_RPG.Notify.SkillTrainerOnly"));
      return null;
    }
    const { rollSkill } = await import("../helpers/rolls.mjs");
    return rollSkill(this, skillKey, options);
  }

  /**
   * Helper público para rolar um atributo bruto.
   */
  async rollAttribute(attrKey, options = {}) {
    const { rollAttribute } = await import("../helpers/rolls.mjs");
    return rollAttribute(this, attrKey, options);
  }

  /**
   * Helper público para rolar um golpe (pokemon).
   */
  async rollMove(itemId, options = {}) {
    if ( this.type !== "pokemon" ) {
      ui.notifications?.warn(game.i18n.localize("POKEMON_RPG.Notify.MovePokemonOnly"));
      return null;
    }
    const item = this.items.get(itemId);
    if ( !item ) return null;
    const { rollMove } = await import("../helpers/rolls.mjs");
    return rollMove(this, item, options);
  }
}
