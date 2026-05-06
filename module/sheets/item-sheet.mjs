import { POKEMON_RPG } from "../helpers/config.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

/**
 * Sheet genérica para todos os tipos de Item.
 * Usa o tipo do item para escolher o template "tipado".
 */
export class PokemonItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {

  static DEFAULT_OPTIONS = {
    classes: ["pokemon-rpg", "sheet", "item"],
    position: { width: 560, height: 540 },
    window: { resizable: true, contentClasses: ["scrollable"] },
    form: {
      submitOnChange: true,
      closeOnSubmit: false
    }
  };

  static PARTS = {
    header: { template: "systems/pokemon-rpg/templates/item/item-header.hbs" },
    body:   { template: "systems/pokemon-rpg/templates/item/item-body.hbs" }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const item = this.item;
    context.item = item;
    context.system = item.system;
    context.config = POKEMON_RPG;

    // Choices para selects, conforme o tipo.
    context.typeChoices = Object.fromEntries(
      Object.entries(POKEMON_RPG.types).map(([k, l]) => [k, game.i18n.localize(l)])
    );
    context.attributeChoices = Object.fromEntries(
      Object.entries(POKEMON_RPG.attributes).map(([k, l]) => [k, game.i18n.localize(l)])
    );
    context.moveCategoryChoices = Object.fromEntries(
      Object.entries(POKEMON_RPG.moveCategories).map(([k, l]) => [k, game.i18n.localize(l)])
    );

    // Slugs de classes/subclasses para selects.
    context.classSlugChoices = POKEMON_RPG.allClassSlugs
      ? Object.fromEntries(
          Object.entries(POKEMON_RPG.allClassSlugs()).map(([k, l]) => [k, game.i18n.localize(l)])
        )
      : {};
    // Apenas classes-mãe (para select de parentClass).
    context.parentClassChoices = Object.fromEntries(
      Object.entries(POKEMON_RPG.classHierarchy ?? {}).map(([k, def]) => [k, game.i18n.localize(def.label)])
    );
    // Categorias de talento.
    context.talentCategoryChoices = Object.fromEntries(
      Object.entries(POKEMON_RPG.talentCategories ?? {}).map(([k, l]) => [k, game.i18n.localize(l)])
    );

    // Descrição enriquecida.
    if ( item.system.description !== undefined ) {
      context.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        item.system.description, { async: true, relativeTo: item }
      );
    }

    return context;
  }
}
