/**
 * stage.mjs
 *
 * Sistema de "palco" de avatares — funcionalidade nativa do sistema,
 * sem dependência externa. Permite colocar atores em cena via clique
 * direito no diretório, exibir avatares grandes na tela, e ativar /
 * desativar cada um com um clique.
 *
 * Estado:
 *  - `_staged`   : Set<string> de UUIDs dos atores no palco
 *  - `_activeUuid`: UUID do ator com avatar grande visível agora (ou null)
 *  - Persistido por usuário em user flags:
 *      pokemon-rpg.stagedActors → array de UUIDs
 *      pokemon-rpg.stageActive  → UUID ativo
 *
 * UI:
 *  - Barra inferior arredondada com avatares pequenos clicáveis
 *  - Avatar grande no canto inferior esquerdo (persiste até desativar)
 *  - Botão "X" na barra esvazia o palco inteiro
 *
 * Interações:
 *  - Clique no avatar pequeno  → ativa/desativa esse ator (toggle do grande)
 *  - Clique no avatar grande   → desativa (esconde, mas mantém na barra)
 *  - Clique direito no pequeno → remove do palco
 *  - Clique no "X" da barra    → esvazia o palco
 *  - Clique direito no actor directory → "Adicionar ao palco"
 *
 * Este módulo é totalmente independente — não toca em ActorSheets nem
 * altera o ciclo de render de nenhuma classe ApplicationV2.
 */

const FLAG_SCOPE  = "pokemon-rpg";
const FLAG_STAGED = "stagedActors";
const FLAG_ACTIVE = "stageActive";

export class Stage {

  /* ──────────────────────────────────────────────── */
  /*  Estado                                          */
  /* ──────────────────────────────────────────────── */

  static _staged = new Set();
  static _activeUuid = null;
  static _booted = false;

  static async _load() {
    const list = game.user?.getFlag(FLAG_SCOPE, FLAG_STAGED) ?? [];
    Stage._staged = new Set(Array.isArray(list) ? list : []);
    const active = game.user?.getFlag(FLAG_SCOPE, FLAG_ACTIVE) ?? null;
    Stage._activeUuid = (active && Stage._staged.has(active)) ? active : null;
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

  /* ──────────────────────────────────────────────── */
  /*  API pública                                     */
  /* ──────────────────────────────────────────────── */

  /** Adiciona o ator ao palco. Já o deixa ativo (avatar grande visível). */
  static async add(actor) {
    if ( !actor?.uuid ) return;
    const wasStaged = Stage._staged.has(actor.uuid);
    Stage._staged.add(actor.uuid);
    Stage._activeUuid = actor.uuid;
    await Stage._save();
    Stage._render();
    if ( !wasStaged ) {
      ui.notifications?.info(
        game.i18n.format("POKEMON_RPG.Stage.Added", { name: actor.name })
      );
    }
  }

  /** Remove o ator do palco (some da barra e do avatar grande). */
  static async remove(actor) {
    if ( !actor?.uuid ) return;
    const had = Stage._staged.delete(actor.uuid);
    if ( Stage._activeUuid === actor.uuid ) Stage._activeUuid = null;
    await Stage._save();
    Stage._render();
    if ( had ) {
      ui.notifications?.info(
        game.i18n.format("POKEMON_RPG.Stage.Removed", { name: actor.name })
      );
    }
  }

  /**
   * Alterna o estado "ativo" desse ator:
   *  - Se está ativo  → desativa (esconde o avatar grande)
   *  - Se NÃO está    → ativa (mostra o avatar grande)
   * Mantém o ator na barra em ambos os casos.
   */
  static async toggleActive(uuid) {
    if ( !Stage._staged.has(uuid) ) return;
    Stage._activeUuid = (Stage._activeUuid === uuid) ? null : uuid;
    await Stage._save();
    Stage._render();
  }

  /** Esvazia o palco. */
  static async clear() {
    Stage._staged.clear();
    Stage._activeUuid = null;
    await Stage._save();
    Stage._render();
  }

  /* ──────────────────────────────────────────────── */
  /*  Inicialização                                   */
  /* ──────────────────────────────────────────────── */

  static async init() {
    if ( Stage._booted ) return;
    Stage._booted = true;
    await Stage._load();
    Stage._ensureRoot();
    Stage._render();

    // Menu de contexto no Actor Directory: "Adicionar ao palco" / "Remover do palco".
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

    // Re-renderiza quando o ator no palco muda (nome / avatar).
    Hooks.on("updateActor", (actor) => {
      if ( Stage.isStaged(actor) ) Stage._render();
    });
    Hooks.on("deleteActor", (actor) => {
      if ( Stage.isStaged(actor) ) Stage.remove(actor);
    });
  }

  /* ──────────────────────────────────────────────── */
  /*  DOM / UI                                        */
  /* ──────────────────────────────────────────────── */

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
        <button type="button" class="pkrpg-stage-clear" data-action="clear"
                title="Esvaziar palco" aria-label="Esvaziar palco">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    `;
    document.body.appendChild(root);

    // Delegação de eventos para evitar re-bindar listeners no re-render.
    root.addEventListener("click", (ev) => {
      const target = ev.target.closest("[data-action]");
      if ( !target ) return;
      const action = target.dataset.action;
      if ( action === "clear" ) {
        ev.preventDefault();
        Stage.clear();
      } else if ( action === "activate" ) {
        ev.preventDefault();
        Stage.toggleActive(target.dataset.uuid);
      } else if ( action === "hidePortrait" ) {
        ev.preventDefault();
        // Clicar no avatar grande desativa (mantém no palco).
        if ( Stage._activeUuid ) Stage.toggleActive(Stage._activeUuid);
      }
    });
    root.addEventListener("contextmenu", (ev) => {
      const target = ev.target.closest('[data-action="activate"]');
      if ( !target ) return;
      ev.preventDefault();
      const uuid = target.dataset.uuid;
      const actor = fromUuidSync(uuid);
      if ( actor ) Stage.remove(actor);
    });
  }

  /** Renderiza barra e avatar grande de acordo com o estado. */
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

    // Reconstrói a lista de avatares pequenos.
    const html = [];
    for ( const uuid of Stage._staged ) {
      const actor = fromUuidSync(uuid);
      if ( !actor ) continue;
      const isActive = uuid === Stage._activeUuid;
      const img  = foundry.utils.escapeHTML(actor.img || "icons/svg/mystery-man.svg");
      const name = foundry.utils.escapeHTML(actor.name || "");
      html.push(`
        <button type="button"
                class="pkrpg-stage-actor${isActive ? " active" : ""}"
                data-action="activate" data-uuid="${uuid}"
                title="${name} — clique pra mostrar / esconder; direito pra remover">
          <img src="${img}" alt="" />
          <span class="pkrpg-stage-actor-name">${name}</span>
        </button>
      `);
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

    // Cor de acento: usa cor do dono não-GM do ator, se existir.
    const owner = (game.users ?? []).find(
      u => !u.isGM && actor.testUserPermission(u, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)
    );
    const accent = owner?.color ? String(owner.color) : "#cc0000";
    root.style.setProperty("--pkrpg-stage-accent", accent);

    root.classList.add("visible");
    root.setAttribute("aria-hidden", "false");
  }
}
