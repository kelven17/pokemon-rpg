import { POKEMON_RPG } from "../helpers/config.mjs";
import { rollBallCapture } from "../helpers/ball-roll.mjs";

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
    actions: {
      rollBall: PokemonItemSheet._onRollBall
    },
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
    context.aptidaoChoices = Object.fromEntries(
      Object.entries(POKEMON_RPG.aptitudes ?? {}).map(([k, l]) => [k, game.i18n.localize(l)])
    );
    context.alcanceChoices = Object.fromEntries(
      Object.entries(POKEMON_RPG.ranges ?? {}).map(([k, l]) => [k, game.i18n.localize(l)])
    );
    context.frequenciaChoices = Object.fromEntries(
      Object.entries(POKEMON_RPG.frequencies ?? {}).map(([k, l]) => [k, game.i18n.localize(l)])
    );
    context.concursosChoices = Object.fromEntries(
      Object.entries(POKEMON_RPG.contestDescriptors ?? {}).map(([k, l]) => [k, game.i18n.localize(l)])
    );
    context.abilityTriggerChoices = Object.fromEntries(
      Object.entries(POKEMON_RPG.abilityTriggers ?? {}).map(([k, l]) => [k, game.i18n.localize(l)])
    );
    context.capacityCategoryChoices = Object.fromEntries(
      Object.entries(POKEMON_RPG.capacityCategories ?? {}).map(([k, l]) => [k, game.i18n.localize(l)])
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

  /* ---------- Roll de Pokébola ---------- */
  static async _onRollBall(event, target) {
    event?.preventDefault?.();
    return rollBallCapture(this.item);
  }
}
