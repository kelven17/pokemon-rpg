import { POKEMON_RPG } from "../helpers/config.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/**
 * Ficha de Pokémon (ApplicationV2).
 */
export class PokemonSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  static DEFAULT_OPTIONS = {
    classes: ["pokemon-rpg", "sheet", "actor", "pokemon"],
    position: { width: 680, height: 720 },
    window: { resizable: true, contentClasses: ["scrollable"] },
    actions: {
      rollAttribute: PokemonSheet._onRollAttribute,
      rollMove: PokemonSheet._onRollMove,
      itemCreate: PokemonSheet._onItemCreate,
      itemEdit: PokemonSheet._onItemEdit,
      itemDelete: PokemonSheet._onItemDelete,
      restorePP: PokemonSheet._onRestorePP,
      openTrainer: PokemonSheet._onOpenTrainer,
      tab: PokemonSheet._onChangeTab
    },
    form: {
      submitOnChange: true,
      closeOnSubmit: false
    }
  };

  static PARTS = {
    header: { template: "systems/pokemon-rpg/templates/actor/pokemon-header.hbs" },
    tabs:   { template: "systems/pokemon-rpg/templates/partials/tabs.hbs" },
    main:   { template: "systems/pokemon-rpg/templates/actor/pokemon-main.hbs",       scrollable: [""] },
    moves:  { template: "systems/pokemon-rpg/templates/actor/pokemon-moves.hbs",      scrollable: [""] },
    abilities: { template: "systems/pokemon-rpg/templates/actor/pokemon-abilities.hbs", scrollable: [""] },
    bio:    { template: "systems/pokemon-rpg/templates/actor/pokemon-bio.hbs",        scrollable: [""] }
  };

  static TABS = {
    primary: {
      tabs: [
        { id: "main",      label: "POKEMON_RPG.Tab.Main"      },
        { id: "moves",     label: "POKEMON_RPG.Tab.Moves"     },
        { id: "abilities", label: "POKEMON_RPG.Tab.Abilities" },
        { id: "bio",       label: "POKEMON_RPG.Tab.Bio"       }
      ],
      initial: "main"
    }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.actor;
    const sys = actor.system;

    context.actor = actor;
    context.system = sys;
    context.config = POKEMON_RPG;

    // Atributos.
    context.attributes = {};
    for ( const [key, attr] of Object.entries(sys.attributes) ) {
      context.attributes[key] = {
        ...attr,
        key,
        label: game.i18n.localize(POKEMON_RPG.attributes[key]),
        abbr:  game.i18n.localize(POKEMON_RPG.attributeAbbreviations[key])
      };
    }

    // Tipos com label.
    context.typeLabels = {
      primary: game.i18n.localize(POKEMON_RPG.types[sys.types.primary]),
      secondary: sys.types.secondary
        ? game.i18n.localize(POKEMON_RPG.types[sys.types.secondary])
        : null
    };

    // Items por tipo.
    context.itemsByType = {
      move:      actor.items.filter(i => i.type === "move"),
      ability:   actor.items.filter(i => i.type === "ability"),
      capacity:  actor.items.filter(i => i.type === "capacity")
    };

    // Choices para selects.
    context.typeChoices = Object.fromEntries(
      Object.entries(POKEMON_RPG.types).map(([k, l]) => [k, game.i18n.localize(l)])
    );
    context.typeChoicesNullable = { "": "—", ...context.typeChoices };

    // Trainer info.
    context.trainer = await sys.getTrainer();

    // Bio enriquecida.
    context.enrichedBio = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      sys.biography.value, { async: true, relativeTo: actor }
    );

    // Tabs - constrói contexto manualmente para garantir compatibilidade.
    const activeTab = this.tabGroups?.primary ?? "main";
    context.tabs = this.constructor.TABS.primary.tabs.map(t => ({
      ...t,
      group: "primary",
      active: t.id === activeTab,
      cssClass: t.id === activeTab ? "active" : ""
    }));
    context.activeTab = activeTab;

    return context;
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    this._applyActiveTab();
    // Drag-drop para aceitar moves/abilities/capacities.
    new foundry.applications.ux.DragDrop.implementation({
      dragSelector: ".item",
      dropSelector: ".pokemon-sheet",
      callbacks: { drop: this._onDrop.bind(this) }
    }).bind(this.element);
  }

  _applyActiveTab() {
    const active = this.tabGroups?.primary ?? "main";
    const sections = this.element.querySelectorAll('section[data-tab][data-group="primary"]');
    sections.forEach(s => {
      s.style.display = s.dataset.tab === active ? "" : "none";
    });
    const navs = this.element.querySelectorAll('nav.sheet-tabs .item[data-group="primary"]');
    navs.forEach(a => {
      a.classList.toggle("active", a.dataset.tab === active);
    });
  }

  static _onChangeTab(event, target) {
    const tab = target.dataset.tab;
    if ( !tab ) return;
    this.tabGroups ??= {};
    this.tabGroups.primary = tab;
    this._applyActiveTab();
  }

  async _onDrop(event) {
    const dataString = event.dataTransfer?.getData("text/plain");
    if ( !dataString ) return;
    let data;
    try { data = JSON.parse(dataString); } catch { return; }

    if ( data.type !== "Item" ) return;
    const item = await fromUuid(data.uuid);
    if ( !item ) return;
    if ( !["move", "ability", "capacity"].includes(item.type) ) {
      ui.notifications?.warn(`Pokémon não aceita item do tipo "${item.type}".`);
      return;
    }
    await this.actor.createEmbeddedDocuments("Item", [item.toObject()]);
  }

  /* -------------------------------------------- */
  /*  Action Handlers                              */
  /* -------------------------------------------- */

  static async _onRollAttribute(event, target) {
    const attrKey = target.dataset.attribute;
    return this.actor.rollAttribute(attrKey);
  }

  static async _onRollMove(event, target) {
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    return this.actor.rollMove(itemId);
  }

  static async _onItemCreate(event, target) {
    const type = target.dataset.type;
    const itemData = {
      name: game.i18n.format("POKEMON_RPG.NewItem", { type: game.i18n.localize(`POKEMON_RPG.ItemType.${type}`) }),
      type
    };
    const created = await this.actor.createEmbeddedDocuments("Item", [itemData]);
    created[0]?.sheet.render(true);
  }

  static async _onItemEdit(event, target) {
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    this.actor.items.get(itemId)?.sheet.render(true);
  }

  static async _onItemDelete(event, target) {
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if ( !item ) return;
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("POKEMON_RPG.Confirm.DeleteTitle") },
      content: `<p>${game.i18n.format("POKEMON_RPG.Confirm.DeleteItem", { name: item.name })}</p>`
    });
    if ( confirmed ) await item.delete();
  }

  static async _onRestorePP(event, target) {
    const updates = this.actor.items
      .filter(i => i.type === "move")
      .map(i => ({ _id: i.id, "system.pp.value": i.system.pp.max }));
    if ( updates.length ) await this.actor.updateEmbeddedDocuments("Item", updates);
    ui.notifications?.info(game.i18n.localize("POKEMON_RPG.Notify.PPRestored"));
  }

  static async _onOpenTrainer(event, target) {
    const trainer = await this.actor.system.getTrainer();
    trainer?.sheet.render(true);
  }
}
