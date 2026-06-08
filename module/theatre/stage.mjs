/**
 * stage.mjs — módulo AUTÔNOMO
 *
 * Sistema próprio de "palco" de avatares. NÃO toca em nenhum arquivo
 * existente. Carregado como esmodule independente via system.json e
 * registra seus próprios hooks de ciclo de vida.
 *
 * O usuário marca um ator clicando direito no diretório de actors:
 * "Palco: adicionar / remover". Aparece uma barra inferior com avatares;
 * clicar num avatar pequeno mostra/esconde o avatar grande no canto
 * inferior esquerdo. Clicar direito no avatar pequeno remove do palco.
 */

const FLAG_SCOPE  = "pokemon-rpg";
const FLAG_STAGED = "stagedActors";
const FLAG_ACTIVE = "stageActive";

class Stage {
  static _staged = new Set();
  static _activeUuid = null;
  static _booted = false;

  static async _load() {
    const list = game.user?.getFlag(FLAG_SCOPE, FLAG_STAGED) ?? [];
    Stage._staged = new Set(Array.isArray(list) ? list : []);
    const a = game.user?.getFlag(FLAG_SCOPE, FLAG_ACTIVE) ?? null;
    Stage._activeUuid = (a && Stage._staged.has(a)) ? a : null;
  }

  static async _save() {
    if ( !game.user ) return;
    try {
      await game.user.setFlag(FLAG_SCOPE, FLAG_STAGED, [...Stage._staged]);
      await game.user.setFlag(FLAG_SCOPE, FLAG_ACTIVE, Stage._activeUuid);
    } catch (err) {
      console.warn("pokemon-rpg | Stage._save:", err);
    }
  }

  static isStaged(actor) {
    return !!actor?.uuid && Stage._staged.has(actor.uuid);
  }

  static async add(actor) {
    if ( !actor?.uuid ) return;
    const had = Stage._staged.has(actor.uuid);
    Stage._staged.add(actor.uuid);
    Stage._activeUuid = actor.uuid;
    await Stage._save();
    Stage._render();
    Hooks.callAll("pkrpg-stage-changed");
    if ( !had ) {
      ui.notifications?.info(
        game.i18n?.format?.("POKEMON_RPG.Stage.Added", { name: actor.name })
        ?? `${actor.name} entrou em cena`
      );
    }
  }

  static async remove(actor) {
    if ( !actor?.uuid ) return;
    const had = Stage._staged.delete(actor.uuid);
    if ( Stage._activeUuid === actor.uuid ) Stage._activeUuid = null;
    await Stage._save();
    Stage._render();
    Hooks.callAll("pkrpg-stage-changed");
    if ( had ) {
      ui.notifications?.info(
        game.i18n?.format?.("POKEMON_RPG.Stage.Removed", { name: actor.name })
        ?? `${actor.name} saiu de cena`
      );
    }
  }

  static async toggleActive(uuid) {
    if ( !Stage._staged.has(uuid) ) return;
    Stage._activeUuid = (Stage._activeUuid === uuid) ? null : uuid;
    await Stage._save();
    Stage._render();
  }

  /** Alterna a presença do ator no palco (add se não está, remove se está). */
  static async toggle(actor) {
    if ( !actor?.uuid ) return;
    if ( Stage._staged.has(actor.uuid) ) return Stage.remove(actor);
    return Stage.add(actor);
  }

  static async clear() {
    Stage._staged.clear();
    Stage._activeUuid = null;
    await Stage._save();
    Stage._render();
  }

  static async _init() {
    if ( Stage._booted ) return;
    Stage._booted = true;
    await Stage._load();
    Stage._ensureRoot();
    Stage._render();

    Hooks.on("getActorContextOptions", (_app, options) => {
      options.push({
        name: "POKEMON_RPG.Stage.MenuToggle",
        icon: '<i class="fa-solid fa-masks-theater"></i>',
        condition: (li) => {
          const id = li?.dataset?.entryId ?? li?.dataset?.documentId
                  ?? li?.[0]?.dataset?.entryId ?? li?.[0]?.dataset?.documentId;
          return !!(id && game.actors?.get(id));
        },
        callback: (li) => {
          const id = li?.dataset?.entryId ?? li?.dataset?.documentId
                  ?? li?.[0]?.dataset?.entryId ?? li?.[0]?.dataset?.documentId;
          const actor = game.actors?.get(id);
          if ( !actor ) return;
          if ( Stage.isStaged(actor) ) return Stage.remove(actor);
          return Stage.add(actor);
        }
      });
    });

    Hooks.on("updateActor", (actor) => {
      if ( Stage.isStaged(actor) ) Stage._render();
    });
    Hooks.on("deleteActor", (actor) => {
      if ( Stage.isStaged(actor) ) Stage.remove(actor);
    });

    // ── Botão no header das fichas (injeção DOM externa) ──
    // Nenhum sheet é modificado — apenas escutamos o hook de render e
    // adicionamos um `<button>` ao `.window-header` se ainda não estiver lá.
    Hooks.on("renderTrainerSheet", Stage._injectSheetButton);
    Hooks.on("renderPokemonSheet", Stage._injectSheetButton);
    // Atualiza o estado visual de todos os botões abertos quando o palco muda.
    Hooks.on("pkrpg-stage-changed", Stage._refreshSheetButtons);

    // Expõe no global para uso via macros/console.
    globalThis.PokemonRpgStage = Stage;
  }

  /**
   * Hook handler: ao renderizar um sheet, garante que existe um botão
   * de toggle do palco no header. Não toca em código do sheet.
   */
  static _injectSheetButton(app, element /*, context */) {
    try {
      const actor = app?.actor;
      if ( !actor?.uuid ) return;
      // Resolve o root: o segundo argumento do hook pode ser HTMLElement,
      // jQuery, ou indefinido em algumas variantes — fallback pra app.element.
      const root = (element instanceof HTMLElement) ? element
                 : (element && element[0] instanceof HTMLElement) ? element[0]
                 : app.element;
      if ( !root ) return;
      const header = root.querySelector?.(".window-header");
      if ( !header ) return;
      // Não duplica.
      if ( header.querySelector(".pkrpg-stage-toggle-btn") ) {
        // Apenas atualiza o estado active.
        const existing = header.querySelector(".pkrpg-stage-toggle-btn");
        existing.classList.toggle("active", Stage.isStaged(actor));
        return;
      }
      // Cria o botão no padrão de header-control do ApplicationV2.
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "header-control icon fa-solid fa-masks-theater pkrpg-stage-toggle-btn";
      btn.dataset.pkrpgActorUuid = actor.uuid;
      btn.classList.toggle("active", Stage.isStaged(actor));
      const label = game.i18n?.localize?.("POKEMON_RPG.Stage.MenuToggle") || "Palco";
      btn.setAttribute("data-tooltip", label);
      btn.setAttribute("aria-label", label);
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        await Stage.toggle(actor);
        btn.classList.toggle("active", Stage.isStaged(actor));
        Hooks.callAll("pkrpg-stage-changed");
      });
      // Insere antes do botão de fechar (data-action="close"). Se não achar,
      // adiciona ao final do header.
      const closeBtn = header.querySelector('[data-action="close"]');
      if ( closeBtn ) header.insertBefore(btn, closeBtn);
      else header.appendChild(btn);
    } catch (err) {
      console.warn("pokemon-rpg | Stage._injectSheetButton:", err);
    }
  }

  /** Sincroniza o estado .active de todos os botões já injetados. */
  static _refreshSheetButtons() {
    document.querySelectorAll(".pkrpg-stage-toggle-btn").forEach(btn => {
      const uuid = btn.dataset.pkrpgActorUuid;
      btn.classList.toggle("active", uuid && Stage._staged.has(uuid));
    });
  }

  static _ensureRoot() {
    if ( document.getElementById("pkrpg-stage") ) return;
    const root = document.createElement("div");
    root.id = "pkrpg-stage";
    root.innerHTML = `
      <div id="pkrpg-stage-portrait" class="pkrpg-stage-portrait" data-action="hidePortrait" aria-hidden="true">
        <img class="pkrpg-stage-portrait-img" alt="" />
        <div class="pkrpg-stage-portrait-name"></div>
      </div>
      <div id="pkrpg-stage-bar" class="pkrpg-stage-bar empty" role="toolbar" aria-label="Stage">
        <div class="pkrpg-stage-actors"></div>
        <button type="button" class="pkrpg-stage-clear" data-action="clear" title="Esvaziar palco" aria-label="Esvaziar palco">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    `;
    document.body.appendChild(root);

    root.addEventListener("click", (ev) => {
      const t = ev.target.closest("[data-action]");
      if ( !t ) return;
      const a = t.dataset.action;
      if ( a === "clear" ) { ev.preventDefault(); Stage.clear(); }
      else if ( a === "activate" ) { ev.preventDefault(); Stage.toggleActive(t.dataset.uuid); }
      else if ( a === "hidePortrait" ) {
        ev.preventDefault();
        if ( Stage._activeUuid ) Stage.toggleActive(Stage._activeUuid);
      }
    });
    root.addEventListener("contextmenu", (ev) => {
      const t = ev.target.closest('[data-action="activate"]');
      if ( !t ) return;
      ev.preventDefault();
      const actor = fromUuidSync(t.dataset.uuid);
      if ( actor ) Stage.remove(actor);
    });
  }

  static _render() {
    Stage._ensureRoot();
    Stage._renderBar();
    Stage._renderPortrait();
  }

  static _renderBar() {
    const bar  = document.getElementById("pkrpg-stage-bar");
    const list = bar?.querySelector(".pkrpg-stage-actors");
    if ( !bar || !list ) return;
    if ( Stage._staged.size === 0 ) {
      bar.classList.add("empty");
      list.innerHTML = "";
      return;
    }
    bar.classList.remove("empty");
    const escape = (s) => String(s ?? "")
      .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
      .replaceAll('"',"&quot;").replaceAll("'","&#39;");
    const html = [];
    for ( const uuid of Stage._staged ) {
      const actor = fromUuidSync(uuid);
      if ( !actor ) continue;
      const isActive = uuid === Stage._activeUuid;
      const img  = escape(actor.img || "icons/svg/mystery-man.svg");
      const name = escape(actor.name || "");
      html.push(
        `<button type="button" class="pkrpg-stage-actor${isActive ? " active" : ""}"`
        + ` data-action="activate" data-uuid="${escape(uuid)}"`
        + ` title="${name}"><img src="${img}" alt="" />`
        + `<span class="pkrpg-stage-actor-name">${name}</span></button>`
      );
    }
    list.innerHTML = html.join("");
  }

  static _renderPortrait() {
    const root = document.getElementById("pkrpg-stage-portrait");
    if ( !root ) return;
    const img  = root.querySelector(".pkrpg-stage-portrait-img");
    const name = root.querySelector(".pkrpg-stage-portrait-name");
    if ( !Stage._activeUuid ) {
      root.classList.remove("visible");
      root.setAttribute("aria-hidden", "true");
      return;
    }
    const actor = fromUuidSync(Stage._activeUuid);
    if ( !actor ) {
      root.classList.remove("visible");
      root.setAttribute("aria-hidden", "true");
      return;
    }
    img.src  = actor.img || "icons/svg/mystery-man.svg";
    img.alt  = actor.name || "";
    name.textContent = actor.name || "";
    const owner = (game.users ?? []).find(
      u => !u.isGM && actor.testUserPermission(u, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)
    );
    const accent = owner?.color ? String(owner.color) : "#cc0000";
    root.style.setProperty("--pkrpg-stage-accent", accent);
    root.classList.add("visible");
    root.setAttribute("aria-hidden", "false");
  }
}

// Auto-registra hooks — esse módulo é autônomo, não precisa ser chamado
// de fora.
Hooks.once("ready", () => Stage._init());
