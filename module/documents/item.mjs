/**
 * Classe customizada de Item.
 * Praticamente toda lógica vive no DataModel.
 */
export class PokemonItem extends Item {

  /** @override */
  prepareData() {
    super.prepareData();
  }

  /**
   * Helper para itens do tipo "move" - delega para o helper de rolagem.
   */
  async use(options = {}) {
    if ( this.type === "move" && this.actor ) {
      const { rollMove } = await import("../helpers/rolls.mjs");
      return rollMove(this.actor, this, options);
    }
    if ( this.actor ) {
      // Outros tipos: posta um chat card descritivo.
      const { postItemCard } = await import("../helpers/rolls.mjs");
      return postItemCard(this.actor, this);
    }
  }
}
