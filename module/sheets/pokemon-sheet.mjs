import { POKEMON_RPG } from "../helpers/config.mjs";
import { PokemonSheetPhaseHelpers } from "../helpers/phases.mjs";
import { findItemsByName } from "../helpers/compendium-lookup.mjs";

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
      resetMovesEncounter: PokemonSheet._onResetMovesEncounter,
      resetMovesDaily: PokemonSheet._onResetMovesDaily,
      openTrainer: PokemonSheet._onOpenTrainer,
      applySpecies: PokemonSheet._onApplySpecies,
      phaseUp: PokemonSheet._onPhaseUp,
      phaseDown: PokemonSheet._onPhaseDown,
      phaseReset: PokemonSheet._onPhaseReset,
      phaseResetAll: PokemonSheet._onPhaseResetAll,
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

  /**
   * Formata um multiplicador de efetividade para exibição na ficha.
   * Ex.: 4 → "×4", 0.5 → "×½", 0.25 → "×¼", 0 → "0".
   */
  static _formatMultiplier(mult) {
    if ( mult === 0 ) return "0";
    if ( mult === 0.25 ) return "×¼";
    if ( mult === 0.5 ) return "×½";
    if ( mult === 2 ) return "×2";
    if ( mult === 4 ) return "×4";
    return `×${mult}`;
  }

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

    // ---- Efetividade de tipos (fraquezas / resistências / imunidades) ----
    // Itera sobre cada tipo de ataque possível e calcula o multiplicador
    // contra a combinação de tipos do Pokémon.
    const weaknesses = [];   // mult > 1
    const resistances = [];  // 0 < mult < 1
    const immunities = [];   // mult = 0
    for ( const typeKey of Object.keys(POKEMON_RPG.types) ) {
      const mult = sys.getTypeEffectiveness(typeKey);
      const entry = {
        type: typeKey,
        label: game.i18n.localize(POKEMON_RPG.types[typeKey]),
        multiplier: mult,
        // Texto curto exibido junto do badge (×4, ×2, ×½, ×¼, IMUNE).
        multLabel: PokemonSheet._formatMultiplier(mult)
      };
      if ( mult === 0 ) immunities.push(entry);
      else if ( mult > 1 ) weaknesses.push(entry);
      else if ( mult < 1 ) resistances.push(entry);
    }
    // Ordena fraquezas: maior → menor (×4 antes de ×2).
    weaknesses.sort((a, b) => b.multiplier - a.multiplier);
    // Ordena resistências: menor → maior (×¼ antes de ×½).
    resistances.sort((a, b) => a.multiplier - b.multiplier);
    context.weaknesses = weaknesses;
    context.resistances = resistances;
    context.immunities = immunities;
    context.hasAnyDefense = (resistances.length + immunities.length) > 0;

    // Items por tipo.
    context.itemsByType = {
      move:      actor.items.filter(i => i.type === "move"),
      ability:   actor.items.filter(i => i.type === "ability"),
      capacity:  actor.items.filter(i => i.type === "capacity")
    };

    // Pré-processa habilidades pra incluir um campo `effectText` pronto pra exibição,
    // pois HTMLField em itens pode armazenar sem tags HTML e o template precisa de algo
    // pra renderizar. Também faz fallback para `description` (campo legado).
    context.abilities = context.itemsByType.ability.map(item => {
      const sys = item.system ?? {};
      const raw = (sys.effect && String(sys.effect).trim())
                  || (sys.description && String(sys.description).trim())
                  || "";
      const html = raw && !raw.trim().startsWith("<") ? `<p>${raw}</p>` : raw;
      return {
        id: item.id,
        name: item.name,
        img: item.img,
        system: sys,
        effectHtml: html
      };
    });

    // Pré-processa capacidades — mesmo padrão, faz fallback para description e
    // envolve em <p> se for plain text.
    context.capacities = context.itemsByType.capacity.map(item => {
      const sys = item.system ?? {};
      const raw = (sys.description && String(sys.description).trim())
                  || (sys.effect && String(sys.effect).trim())
                  || "";
      const html = raw && !raw.trim().startsWith("<") ? `<p>${raw}</p>` : raw;
      return {
        id: item.id,
        name: item.name,
        img: item.img,
        system: sys,
        descriptionHtml: html
      };
    });

    // Choices para selects.
    context.typeChoices = Object.fromEntries(
      Object.entries(POKEMON_RPG.types).map(([k, l]) => [k, game.i18n.localize(l)])
    );
    context.typeChoicesNullable = { "": "—", ...context.typeChoices };

    // Naturezas — choices para o select de natureza.
    context.natureChoices = {
      "": game.i18n.localize("POKEMON_RPG.Nature.None"),
      ...Object.fromEntries(
        Object.entries(POKEMON_RPG.natures).map(([k, n]) => [k, game.i18n.localize(n.label)])
      )
    };

    // Espécies disponíveis (mundo + compendium "species" do sistema).
    // Ordenado por número da Pokédex.
    context.speciesOptions = await PokemonSheet._collectSpeciesOptions();

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
  _initializeApplicationOptions(options) {
    const opts = super._initializeApplicationOptions(options);
    this.tabGroups ??= {};
    this.tabGroups.primary ??= "main";
    return opts;
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    // Drag-drop para aceitar moves/abilities/capacities.
    new foundry.applications.ux.DragDrop.implementation({
      dragSelector: ".item",
      dropSelector: ".pokemon-sheet",
      callbacks: { drop: this._onDrop.bind(this) }
    }).bind(this.element);
  }

  /**
   * Troca de aba — atualiza apenas as classes .active sem disparar re-render.
   */
  static _onChangeTab(event, target) {
    const tab = target.dataset.tab;
    if ( !tab ) return;
    this.tabGroups ??= {};
    this.tabGroups.primary = tab;
    const sections = this.element.querySelectorAll('section.tab[data-group="primary"]');
    sections.forEach(s => s.classList.toggle("active", s.dataset.tab === tab));
    const navs = this.element.querySelectorAll('nav.sheet-tabs .item[data-group="primary"]');
    navs.forEach(a => a.classList.toggle("active", a.dataset.tab === tab));
  }

  async _onDrop(event) {
    const dataString = event.dataTransfer?.getData("text/plain");
    if ( !dataString ) return;
    let data;
    try { data = JSON.parse(dataString); } catch { return; }

    if ( data.type !== "Item" ) return;
    const item = await fromUuid(data.uuid);
    if ( !item ) return;

    // Espécie: aplica os atributos base ao Pokémon em vez de embutir o item.
    if ( item.type === "species" ) {
      return this._applySpecies(item);
    }

    if ( !["move", "ability", "capacity"].includes(item.type) ) {
      ui.notifications?.warn(`Pokémon não aceita item do tipo "${item.type}".`);
      return;
    }
    await this.actor.createEmbeddedDocuments("Item", [item.toObject()]);
  }

  /* -------------------------------------------- */
  /*  Aplicação de Espécie                         */
  /* -------------------------------------------- */

  /**
   * Coleta espécies disponíveis: itens do mundo + qualquer compendium de Item.
   * Retorna [{ uuid, name, dexNumber }] ordenado por número da Pokédex.
   */
  static async _collectSpeciesOptions() {
    const list = [];
    const seen = new Set();

    // 1. Itens do tipo "species" no mundo.
    for ( const item of game.items?.filter(i => i.type === "species") ?? [] ) {
      if ( seen.has(item.uuid) ) continue;
      seen.add(item.uuid);
      list.push({
        uuid: item.uuid,
        name: item.name,
        dexNumber: item.system?.dexNumber ?? 9999
      });
    }

    // 2. Varre todos os compendiums de Item — não só o do sistema.
    //    Em Foundry v11+ o UUID do compendium é
    //    `Compendium.<collection>.<DocumentName>.<entryId>`.
    const itemPacks = (game.packs ?? []).filter(p => p.metadata?.type === "Item");
    for ( const pack of itemPacks ) {
      try {
        const index = await pack.getIndex({ fields: ["type", "system.dexNumber"] });
        for ( const entry of index ) {
          if ( entry.type && entry.type !== "species" ) continue;
          const uuid = entry.uuid
            ?? `Compendium.${pack.collection}.${pack.documentName}.${entry._id}`;
          if ( seen.has(uuid) ) continue;
          seen.add(uuid);
          list.push({
            uuid,
            name: entry.name,
            dexNumber: entry.system?.dexNumber ?? 9999
          });
        }
      } catch (err) {
        console.warn(`pokemon-rpg | falha ao indexar pack ${pack.collection}:`, err);
      }
    }

    list.sort((a, b) => (a.dexNumber - b.dexNumber) || a.name.localeCompare(b.name));
    if ( list.length === 0 ) {
      console.warn(
        "pokemon-rpg | nenhuma espécie encontrada. " +
        "Importe espécies do compendium (Drag-and-drop do compendium pra aba Items, " +
        "ou crie itens do tipo 'Espécie' manualmente)."
      );
    } else {
      console.log(`pokemon-rpg | ${list.length} espécie(s) disponíveis na ficha.`);
    }
    return list;
  }

  /**
   * Aplica os dados completos de uma Espécie ao Pokémon:
   *
   *  - Atributos basais (Saúde, Ataque, Defesa, etc.) — copia direto do livro
   *  - Tipos primário/secundário
   *  - Número da Pokédex
   *  - Natureza aleatória, com delta aplicado nos atributos
   *  - **Cria items embeddados:**
   *      • Golpes Naturais cujo nível ≤ nível do pokémon (e os de "Evolução"
   *        se o pokémon estiver evoluído de uma espécie anterior)
   *      • Primeira Habilidade da lista (se não tiver outra)
   *      • Capacidades naturais (Outras + numéricas + deslocamentos como special)
   *  - Renomeia o ator se o nome ainda for genérico
   *
   * Usa flag `pkrpgSkipNatureHook` no update do actor pra não duplicar delta.
   */
  async _applySpecies(speciesItem) {
    if ( !speciesItem || speciesItem.type !== "species" ) return;
    const sys = speciesItem.system ?? {};

    // ─── 1. Atributos basais (copiados direto do livro) ─────────
    const stats = sys.baseStats ?? {};
    const values = {
      hp:  Math.max(0, Number(stats.hp)  || 0),
      atk: Math.max(0, Number(stats.atk) || 0),
      def: Math.max(0, Number(stats.def) || 0),
      spa: Math.max(0, Number(stats.spa) || 0),
      spd: Math.max(0, Number(stats.spd) || 0),
      spe: Math.max(0, Number(stats.spe) || 0)
    };

    // ─── 2. Natureza sorteada + delta nos atributos ─────────────
    const natureKey = POKEMON_RPG.randomNature();
    const nature    = POKEMON_RPG.natures?.[natureKey];
    if ( nature?.up && values[nature.up] !== undefined ) {
      values[nature.up] = Math.max(0, values[nature.up] + 1);
    }
    if ( nature?.down && values[nature.down] !== undefined ) {
      values[nature.down] = Math.max(0, values[nature.down] - 1);
    }

    const updates = {
      "system.species.uuid":         speciesItem.uuid ?? "",
      "system.species.name":         speciesItem.name ?? "",
      "system.species.dexNumber":    sys.dexNumber ?? null,
      "system.types.primary":        sys.types?.primary ?? "normal",
      "system.types.secondary":      sys.types?.secondary ?? null,
      "system.details.nature":       natureKey,
      "system.attributes.hp.value":  values.hp,
      "system.attributes.atk.value": values.atk,
      "system.attributes.def.value": values.def,
      "system.attributes.spa.value": values.spa,
      "system.attributes.spd.value": values.spd,
      "system.attributes.spe.value": values.spe
    };

    // Renomeia ator se nome genérico
    const currentName = this.actor.name ?? "";
    const genericNames = ["Pokémon", "Pokemon", "New Actor", "Novo Actor"];
    if ( !currentName || genericNames.includes(currentName) ) {
      updates["name"] = speciesItem.name;
    }

    await this.actor.update(updates, { pkrpgSkipNatureHook: true });

    // ─── 3. Cria items embedded (moves/abilities/capacities) ────
    // Limpa items existentes do tipo "move", "ability" e "capacity" pra
    // evitar duplicação no re-apply.
    const oldEmbedded = this.actor.items
      .filter(i => ["move","ability","capacity"].includes(i.type))
      .map(i => i.id);
    if ( oldEmbedded.length ) {
      await this.actor.deleteEmbeddedDocuments("Item", oldEmbedded);
    }

    const pokeLevel = this.actor.system.details?.level ?? 1;

    // Coleta itens a criar
    const itemsToCreate = [];

    // 3.1. Moves naturais (level ≤ pokeLevel + os de "evolution" se evoluído)
    //      Olhamos a cadeia: se essa espécie é uma evolução de outra, inclui
    //      todos os moves de "evolution" das anteriores.
    const learnset = sys.learnset ?? [];
    const moveNames = new Set();
    for ( const entry of learnset ) {
      const level   = Number(entry.level) || 0;
      const trigger = entry.trigger ?? "level";
      // Aprendido ao subir de nível: precisa que pokeLevel >= entry.level
      // Aprendido por evolução: precisa que esta espécie venha de outra
      //   (campo `evolucoes` com from!==this.name implica evoluiu)
      const isEvolved = (sys.evolucoes ?? []).some(
        e => e.to === speciesItem.name && e.from !== speciesItem.name
      );
      const learn = (trigger === "evolution") ? isEvolved : (pokeLevel >= level);
      if ( learn && entry.move ) moveNames.add(entry.move);
    }
    const moveItems = await findItemsByName("move", [...moveNames]);
    itemsToCreate.push(...moveItems);

    // 3.2. Habilidade — pega a primeira da lista de habilidades comuns
    const habilidades = sys.habilidades ?? [];
    if ( habilidades.length > 0 ) {
      const abilityItems = await findItemsByName("ability", [habilidades[0]]);
      itemsToCreate.push(...abilityItems);
    }

    // 3.3. Capacidades — outras + cria entries pras numéricas com valor
    const capData = sys.capacidades ?? {};
    const capNames = new Set();
    for ( const o of capData.outras ?? [] ) capNames.add(o);
    const capItems = await findItemsByName("capacity", [...capNames]);
    // Aplica o valor numérico (se vier de Outras com formato "Nome N")
    itemsToCreate.push(...capItems);

    // Capacidades numéricas (Força, Inteligência, Salto) — cria items com valor
    for ( const [key, slug] of [["forca","Força"],["inteligencia","Inteligência"],["salto","Salto"]] ) {
      const value = capData[key];
      if ( value == null ) continue;
      const items = await findItemsByName("capacity", [slug]);
      for ( const it of items ) {
        if ( !it.system ) it.system = {};
        it.system.value = value;
      }
      itemsToCreate.push(...items);
    }

    // Deslocamentos como capacidades especiais com valor
    const deslocamentos = sys.deslocamentos ?? {};
    for ( const [key, slug] of [
      ["terrestre","Terrestre"],["natacao","Natação"],["voo","Voo"],
      ["escavacao","Escavação"],["subaquatico","Subaquático"]
    ] ) {
      const val = deslocamentos[key];
      if ( val == null ) continue;
      const items = await findItemsByName("capacity", [slug]);
      for ( const it of items ) {
        if ( !it.system ) it.system = {};
        it.system.value = val;
      }
      itemsToCreate.push(...items);
    }

    if ( itemsToCreate.length ) {
      await this.actor.createEmbeddedDocuments("Item", itemsToCreate);
    }

    // Marca o nível atual como "já aprendido" — o hook updateActor só vai
    // aprender NOVOS golpes em level-ups subsequentes.
    await this.actor.setFlag("pokemon-rpg", "lastLevelLearned", pokeLevel);

    ui.notifications?.info(
      game.i18n.format("POKEMON_RPG.Species_Applied", { name: speciesItem.name })
      + ` (${itemsToCreate.length} item(s) adicionado(s))`
    );
  }

  /**
   * Action: chamado pelo botão "Aplicar espécie" no template.
   * Lê o UUID selecionado no <select> irmão (data-species-select) e aplica.
   */
  static async _onApplySpecies(event, target) {
    event?.preventDefault?.();
    const root = target.closest(".species-picker") ?? this.element;
    const select = root.querySelector(".species-pick-select");
    const uuid = select?.value;
    if ( !uuid ) {
      ui.notifications?.warn(game.i18n.localize("POKEMON_RPG.Species_NotFound"));
      return;
    }
    const item = await fromUuid(uuid);
    if ( !item ) {
      ui.notifications?.warn(game.i18n.localize("POKEMON_RPG.Species_NotFound"));
      return;
    }
    return this._applySpecies(item);
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

  static async _onResetMovesEncounter(event, target) {
    const { resetMoveUsage } = await import("../helpers/rolls.mjs");
    return resetMoveUsage(this.actor, "encounter");
  }

  static async _onResetMovesDaily(event, target) {
    const { resetMoveUsage } = await import("../helpers/rolls.mjs");
    return resetMoveUsage(this.actor, "daily");
  }

  static async _onOpenTrainer(event, target) {
    const trainer = await this.actor.system.getTrainer();
    trainer?.sheet.render(true);
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
}
