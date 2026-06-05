import { POKEMON_RPG } from "../helpers/config.mjs";
import { PokemonSheetPhaseHelpers } from "../helpers/phases.mjs";
import { applyOwnerColor } from "../helpers/owner-color.mjs";
import { Stage } from "../theatre/stage.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/**
 * Ficha de Treinador (ApplicationV2).
 */
export class TrainerSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  static DEFAULT_OPTIONS = {
    classes: ["pokemon-rpg", "sheet", "actor", "trainer"],
    position: { width: 720, height: 760 },
    window: { resizable: true, contentClasses: ["scrollable"] },
    actions: {
      rollSkill: TrainerSheet._onRollSkill,
      rollAttribute: TrainerSheet._onRollAttribute,
      toggleProficiency: TrainerSheet._onToggleProficiency,
      openPokemon: TrainerSheet._onOpenPokemon,
      removePokemon: TrainerSheet._onRemovePokemon,
      setActivePokemon: TrainerSheet._onSetActivePokemon,
      itemCreate: TrainerSheet._onItemCreate,
      itemEdit: TrainerSheet._onItemEdit,
      itemDelete: TrainerSheet._onItemDelete,
      itemUse: TrainerSheet._onItemUse,
      acquireClass: TrainerSheet._onAcquireClass,
      phaseUp: TrainerSheet._onPhaseUp,
      phaseDown: TrainerSheet._onPhaseDown,
      phaseReset: TrainerSheet._onPhaseReset,
      phaseResetAll: TrainerSheet._onPhaseResetAll,
      tab: TrainerSheet._onChangeTab,
      pkrpgStage: TrainerSheet._onToggleStage
    },
    form: {
      submitOnChange: true,
      closeOnSubmit: false
    }
  };

  static PARTS = {
    header: { template: "systems/pokemon-rpg/templates/actor/trainer-header.hbs" },
    tabs:   { template: "systems/pokemon-rpg/templates/partials/tabs.hbs" },
    main:   { template: "systems/pokemon-rpg/templates/actor/trainer-main.hbs",   scrollable: [""] },
    skills: { template: "systems/pokemon-rpg/templates/actor/trainer-skills.hbs", scrollable: [""] },
    items:  { template: "systems/pokemon-rpg/templates/actor/trainer-items.hbs",  scrollable: [""] },
    party:  { template: "systems/pokemon-rpg/templates/actor/trainer-party.hbs",  scrollable: [""] },
    bio:    { template: "systems/pokemon-rpg/templates/actor/trainer-bio.hbs",    scrollable: [""] }
  };

  static TABS = {
    primary: {
      tabs: [
        { id: "main",   label: "POKEMON_RPG.Tab.Main"   },
        { id: "skills", label: "POKEMON_RPG.Tab.Skills" },
        { id: "items",  label: "POKEMON_RPG.Tab.Items"  },
        { id: "party",  label: "POKEMON_RPG.Tab.Party"  },
        { id: "bio",    label: "POKEMON_RPG.Tab.Bio"    }
      ],
      initial: "main"
    }
  };

  /* -------------------------------------------- */
  /*  Context Preparation                          */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.actor;
    const sys = actor.system;

    context.actor = actor;
    context.system = sys;
    context.config = POKEMON_RPG;

    // Atributos com labels traduzidos.
    context.attributes = {};
    for ( const [key, attr] of Object.entries(sys.attributes) ) {
      context.attributes[key] = {
        ...attr,
        key,
        label: game.i18n.localize(POKEMON_RPG.attributes[key]),
        abbr:  game.i18n.localize(POKEMON_RPG.attributeAbbreviations[key])
      };
    }

    // Perícias agrupadas por atributo.
    context.skillsByAttribute = {};
    for ( const [key, skill] of Object.entries(sys.skills) ) {
      const cfg = POKEMON_RPG.skills[key];
      const attr = cfg.attribute;
      if ( !context.skillsByAttribute[attr] ) {
        context.skillsByAttribute[attr] = {
          attrLabel: game.i18n.localize(POKEMON_RPG.attributes[attr]),
          skills: []
        };
      }
      context.skillsByAttribute[attr].skills.push({
        ...skill,
        key,
        label: game.i18n.localize(cfg.label)
      });
    }

    // Items separados por tipo.
    const allClasses = actor.items.filter(i => i.type === "class");
    const allTalents = actor.items.filter(i => i.type === "talent");
    context.itemsByType = {
      class: allClasses,
      talent: allTalents
    };

    // Helper para enriquecer um talento — devolve apenas dados primitivos
    // (não expõe o DataModel inteiro, evita serialização recursiva).
    const enrichTalent = (t) => {
      const s = t.system ?? {};
      const rawEfeito = (s.efeito && String(s.efeito).trim()) || "";
      const rawDescr  = (s.description && String(s.description).trim()) || "";
      const raw = rawEfeito || rawDescr;
      const html = raw && !raw.trim().startsWith("<") ? `<p>${raw}</p>` : raw;
      return {
        id: t.id,
        name: t.name,
        img: t.img,
        system: {
          category:       s.category       ?? "",
          sourceClass:    s.sourceClass    ?? "",
          requisitos:     s.requisitos     ?? "",
          frequencia:     s.frequencia     ?? "",
          alvo:           s.alvo           ?? "",
          gatilho:        s.gatilho        ?? "",
          contragatilho:  s.contragatilho  ?? "",
          efeito:         s.efeito         ?? "",
          description:    s.description    ?? "",
          requiredLevel:  s.requiredLevel  ?? null,
          activation:     s.activation     ?? "",
          prerequisites:  s.prerequisites  ?? ""
        },
        effectHtml: html
      };
    };

    // ---- Agrupamento de Talentos por Classe ----
    const classGroups = [];
    const usedTalentIds = new Set();
    for ( const cls of allClasses ) {
      const slug = cls.system.slug || "";
      const parentSlug = cls.system.parentClass || "";
      let parentLabel = "";
      if ( parentSlug ) {
        const parentDef = POKEMON_RPG.classHierarchy[parentSlug];
        if ( parentDef ) parentLabel = game.i18n.localize(parentDef.label);
        else parentLabel = parentSlug;
      }
      const characteristics = allTalents.filter(t =>
        t.system.category === "characteristic" && slug && t.system.sourceClass === slug
      );
      const classTalents = allTalents.filter(t =>
        t.system.category === "class" && slug && t.system.sourceClass === slug
      );
      characteristics.forEach(t => usedTalentIds.add(t.id));
      classTalents.forEach(t => usedTalentIds.add(t.id));
      classGroups.push({
        class: cls,
        slug,
        parentSlug,
        parentLabel,
        isSubclass: !!parentSlug,
        characteristics: characteristics.map(enrichTalent),
        talents:         classTalents.map(enrichTalent)
      });
    }
    context.classGroups = classGroups;

    // Talentos gerais (qualquer um pode pegar).
    context.generalTalents = allTalents
      .filter(t => t.system.category === "general" && !usedTalentIds.has(t.id))
      .map(enrichTalent);
    // Talentos sem classe correspondente.
    context.orphanTalents = allTalents
      .filter(t => !usedTalentIds.has(t.id) && t.system.category !== "general")
      .map(enrichTalent);

    // Lista de slugs disponíveis (para selects no item-sheet).
    context.classSlugChoices = POKEMON_RPG.allClassSlugs
      ? Object.fromEntries(
          Object.entries(POKEMON_RPG.allClassSlugs()).map(([k, l]) => [k, game.i18n.localize(l)])
        )
      : {};

    // Classes disponíveis no compendium para o picker (apenas as do Excel).
    // Exclui as que o treinador já possui.
    const ownedSlugs = new Set(allClasses.map(c => c.system?.slug).filter(Boolean));
    context.classOptions = (await TrainerSheet._collectClassOptions())
      .filter(c => !ownedSlugs.has(c.slug));

    // Party de pokémons.
    context.party = await sys.getPartyActors();

    // Bio enriquecida.
    context.enrichedBio = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      sys.biography.value, { async: true, relativeTo: actor }
    );
    context.enrichedNotes = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      sys.biography.notes, { async: true, relativeTo: actor }
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
  _initializeApplicationOptions(options) {
    const opts = super._initializeApplicationOptions(options);
    // Garante que tabGroups.primary já exista antes do primeiro render.
    this.tabGroups ??= {};
    this.tabGroups.primary ??= "main";
    return opts;
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    // Aplica a cor do dono da ficha como acento (sobrescreve --pk-accent etc.)
    applyOwnerColor(this.actor, this.element);
    // Drag-drop de Pokémons na aba party.
    new foundry.applications.ux.DragDrop.implementation({
      dragSelector: ".item",
      dropSelector: ".trainer-sheet, .party-list",
      callbacks: {
        drop: this._onDrop.bind(this)
      }
    }).bind(this.element);
  }

  /* -------------------------------------------- */
  /*  Stage / Palco de Avatares                    */
  /* -------------------------------------------- */

  /** @override — adiciona o botão de palco aos controles do header. */
  _getHeaderControls() {
    const controls = super._getHeaderControls?.() ?? [];
    controls.push({
      action: "pkrpgStage",
      icon: "fa-solid fa-masks-theater",
      label: "POKEMON_RPG.Stage.Toggle"
    });
    return controls;
  }

  static async _onToggleStage(event, target) {
    return Stage.toggle(this.actor);
  }

  /**
   * Troca de aba — atualiza apenas as classes .active no DOM, sem re-render.
   * Mantém o estado em this.tabGroups para que o próximo render server-side
   * já venha com a aba correta marcada.
   */
  static _onChangeTab(event, target) {
    const tab = target.dataset.tab;
    if ( !tab ) return;
    this.tabGroups ??= {};
    this.tabGroups.primary = tab;
    // Atualiza classes .active diretamente no DOM atual.
    const sections = this.element.querySelectorAll('section.tab[data-group="primary"]');
    sections.forEach(s => s.classList.toggle("active", s.dataset.tab === tab));
    const navs = this.element.querySelectorAll('nav.sheet-tabs .item[data-group="primary"]');
    navs.forEach(a => a.classList.toggle("active", a.dataset.tab === tab));
  }

  /* -------------------------------------------- */
  /*  Drag & Drop                                  */
  /* -------------------------------------------- */

  async _onDrop(event) {
    const dataString = event.dataTransfer?.getData("text/plain");
    if ( !dataString ) return;
    let data;
    try { data = JSON.parse(dataString); } catch { return; }

    if ( data.type === "Actor" ) {
      const actor = await fromUuid(data.uuid);
      if ( !actor || actor.type !== "pokemon" ) return;
      await this._addPokemonToParty(actor);
    } else if ( data.type === "Item" ) {
      const item = await fromUuid(data.uuid);
      if ( !item ) return;
      // Aceita talents e classes.
      if ( ["talent", "class"].includes(item.type) ) {
        await this.actor.createEmbeddedDocuments("Item", [item.toObject()]);
      } else {
        ui.notifications?.warn(`Treinadores só aceitam talentos e classes. Item ${item.type} ignorado.`);
      }
    }
  }

  async _addPokemonToParty(pokemon) {
    const party = foundry.utils.deepClone(this.actor.system.party);
    if ( party.length >= 6 ) {
      ui.notifications?.warn(game.i18n.localize("POKEMON_RPG.Notify.PartyFull"));
      return;
    }
    if ( party.find(p => p.uuid === pokemon.uuid) ) {
      ui.notifications?.warn(game.i18n.localize("POKEMON_RPG.Notify.AlreadyInParty"));
      return;
    }
    party.push({ uuid: pokemon.uuid, slot: party.length + 1, active: party.length === 0 });
    await this.actor.update({ "system.party": party });
    // Configura o trainer no pokémon (referência reversa) e marca como capturado.
    await pokemon.update({
      "system.details.trainer": this.actor.uuid,
      "system.details.captured": true
    });
  }

  /* -------------------------------------------- */
  /*  Action Handlers                              */
  /* -------------------------------------------- */

  static async _onRollSkill(event, target) {
    const skillKey = target.dataset.skill;
    return this.actor.rollSkill(skillKey);
  }

  static async _onRollAttribute(event, target) {
    const attrKey = target.dataset.attribute;
    return this.actor.rollAttribute(attrKey);
  }

  static async _onToggleProficiency(event, target) {
    const skillKey = target.dataset.skill;
    const current = this.actor.system.skills[skillKey].proficient;
    await this.actor.update({ [`system.skills.${skillKey}.proficient`]: !current });
  }

  /* ---------- Classes ---------- */

  /**
   * Coleta as classes disponíveis nos compendiums de Item.
   * Retorna [{ uuid, name, slug }] ordenado por nome.
   */
  static async _collectClassOptions() {
    const list = [];
    const seen = new Set();
    const itemPacks = (game.packs ?? []).filter(p => p.metadata?.type === "Item");
    for ( const pack of itemPacks ) {
      try {
        const index = await pack.getIndex({ fields: ["type", "system.slug"] });
        for ( const entry of index ) {
          if ( entry.type !== "class" ) continue;
          const uuid = entry.uuid
            ?? `Compendium.${pack.collection}.${pack.documentName}.${entry._id}`;
          if ( seen.has(uuid) ) continue;
          seen.add(uuid);
          list.push({ uuid, name: entry.name, slug: entry.system?.slug ?? "" });
        }
      } catch (err) {
        console.warn(`pokemon-rpg | falha ao indexar pack ${pack.collection}:`, err);
      }
    }
    // Também classes que já existem como itens de mundo.
    for ( const item of game.items?.filter(i => i.type === "class") ?? [] ) {
      if ( seen.has(item.uuid) ) continue;
      seen.add(item.uuid);
      list.push({ uuid: item.uuid, name: item.name, slug: item.system?.slug ?? "" });
    }
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }

  /**
   * Action: adquire a classe selecionada no picker, criando o item Class
   * embeddado no treinador.
   */
  static async _onAcquireClass(event, target) {
    event?.preventDefault?.();
    const root = target.closest(".class-picker") ?? this.element;
    const select = root.querySelector(".class-pick-select");
    const uuid = select?.value;
    if ( !uuid ) {
      ui.notifications?.warn(game.i18n.localize("POKEMON_RPG.Class_PickFirst"));
      return;
    }
    const classItem = await fromUuid(uuid);
    if ( !classItem || classItem.type !== "class" ) {
      ui.notifications?.warn(game.i18n.localize("POKEMON_RPG.Class_NotFound"));
      return;
    }
    // Evita duplicar a mesma classe.
    const slug = classItem.system?.slug ?? "";
    const already = this.actor.items.some(
      i => i.type === "class" && i.system?.slug === slug
    );
    if ( already ) {
      ui.notifications?.warn(game.i18n.localize("POKEMON_RPG.Class_AlreadyOwned"));
      return;
    }
    await this.actor.createEmbeddedDocuments("Item", [classItem.toObject()]);
    ui.notifications?.info(
      game.i18n.format("POKEMON_RPG.Class_Acquired", { name: classItem.name })
    );
  }

  /* ---------- Fases ---------- */
  static async _onPhaseUp(event, target) {
    return PokemonSheetPhaseHelpers.changePhase(this.actor, target.dataset.attribute, +1);
  }
  static async _onPhaseDown(event, target) {
    return PokemonSheetPhaseHelpers.changePhase(this.actor, target.dataset.attribute, -1);
  }
  static async _onPhaseReset(event, target) {
    return PokemonSheetPhaseHelpers.setPhase(this.actor, target.dataset.attribute, 0);
  }
  static async _onPhaseResetAll(event, target) {
    return PokemonSheetPhaseHelpers.resetAllPhases(this.actor);
  }

  static async _onOpenPokemon(event, target) {
    const uuid = target.dataset.uuid;
    const actor = await fromUuid(uuid);
    actor?.sheet.render(true);
  }

  static async _onRemovePokemon(event, target) {
    const uuid = target.dataset.uuid;
    const party = this.actor.system.party.filter(p => p.uuid !== uuid);
    await this.actor.update({ "system.party": party });
    // Remove o trainer do pokémon e marca como selvagem novamente.
    const pokemon = await fromUuid(uuid);
    if ( pokemon ) await pokemon.update({
      "system.details.trainer": "",
      "system.details.captured": false
    });
  }

  static async _onSetActivePokemon(event, target) {
    const uuid = target.dataset.uuid;
    const party = this.actor.system.party.map(p => ({ ...p, active: p.uuid === uuid }));
    await this.actor.update({ "system.party": party });
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
    const item = this.actor.items.get(itemId);
    item?.sheet.render(true);
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

  static async _onItemUse(event, target) {
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    item?.use();
  }
}
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    item?.use();
  }
}
