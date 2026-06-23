/**
 * item-generic.mjs
 *
 * Schema de "Item" genérico do sistema — cobre poções, pokébolas,
 * pedras elementais, suplementos, melhoradores de desempenho, etc.
 * (Diferente dos tipos existentes: move/talent/class/ability/capacity/species.)
 *
 * Arquivo isolado para não tocar em items.mjs (que é grande e frágil).
 */

const { HTMLField, StringField, NumberField, BooleanField } =
  foundry.data.fields;

/**
 * Categorias de Item (utilidade, frutas/sucos, mantidos, etc.).
 * Cada categoria corresponde a uma seção do "Livro do Jogador" (p. 22-31).
 */
export const ITEM_CATEGORIES = {
  utility:    "POKEMON_RPG.ItemCategory.Utility",
  berry:      "POKEMON_RPG.ItemCategory.Berry",
  juice:      "POKEMON_RPG.ItemCategory.Juice",
  held:       "POKEMON_RPG.ItemCategory.Held",
  medicine:   "POKEMON_RPG.ItemCategory.Medicine",
  ball:       "POKEMON_RPG.ItemCategory.Ball",
  stone:      "POKEMON_RPG.ItemCategory.Stone",
  booster:    "POKEMON_RPG.ItemCategory.Booster",
  supplement: "POKEMON_RPG.ItemCategory.Supplement",
  repellent:  "POKEMON_RPG.ItemCategory.Repellent",
  tm:         "POKEMON_RPG.ItemCategory.TM",
  other:      "POKEMON_RPG.ItemCategory.Other"
};

/** Alvos do item: pokémon, treinador, ou ambos. */
export const ITEM_TARGETS = {
  both:    "POKEMON_RPG.ItemTarget.Both",
  pokemon: "POKEMON_RPG.ItemTarget.Pokemon",
  trainer: "POKEMON_RPG.ItemTarget.Trainer"
};

/**
 * Generic Item DataModel.
 *
 * Campos:
 *   description : HTML
 *   category    : utility|berry|juice|held|medicine|ball|stone|...|other
 *   price       : créditos (inteiro, nullable para itens "indisponíveis")
 *   effect      : texto livre com o efeito mecânico
 *   consumable  : true se gasta ao usar (consumível)
 *   quantity    : quantidade atual no inventário
 *   target      : pokemon|trainer|both
 *   modifier    : modificador numérico (ex.: pokébola, melhorador) — opcional
 *   subtype     : subcategoria livre (ex.: "Pedra Elemental", "Pokébola Lunar")
 *   repulsive   : reduz lealdade do pokémon se usado repetidamente
 */
export class GenericItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField({ required: false, initial: "" }),
      category: new StringField({
        required: true,
        initial: "other",
        choices: () => Object.keys(ITEM_CATEGORIES)
      }),
      price: new NumberField({
        required: false, nullable: true, integer: true, initial: 0, min: 0
      }),
      effect: new StringField({ required: false, initial: "" }),
      consumable: new BooleanField({ required: false, initial: true }),
      quantity:   new NumberField({
        required: false, nullable: false, integer: true, initial: 1, min: 0
      }),
      target: new StringField({
        required: false,
        initial: "both",
        choices: () => Object.keys(ITEM_TARGETS)
      }),
      modifier: new NumberField({
        required: false, nullable: true, integer: true, initial: null
      }),
      subtype:   new StringField({ required: false, initial: "" }),
      repulsive: new BooleanField({ required: false, initial: false })
    };
  }
}
