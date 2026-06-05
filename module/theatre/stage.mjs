/**
 * stage.mjs
 *
 * Sistema próprio de "palco" de avatares — uma alternativa nativa ao
 * Theatre Inserts. Permite colocar atores em cena (botão na ficha ou
 * menu de contexto do diretório), mostrar o avatar atual quando o ator
 * "fala" no chat, e selecionar qual ator está como speaker ativo.
 *
 * Estado:
 *  - Persistido como user flag: `pokemon-rpg.stagedActors` = [uuid]
 *  - `activeUuid` em memória (o último selecionado pelo player)
 *
 * UI:
 *  - Bottom-bar fixa acima do chat com avatares pequenos clicáveis
 *  - Avatar grande tela-cheia-bottom-left ao receber chat message
 *    do speaker correspondente; some sozinho após N segundos
 *
 * Hooks:
 *  - ready: monta UI + popula barra com flags do user
 *  - createChatMessage: detecta speaker.actor e mostra avatar grande
 *  - getActorContextOptions: adiciona "Pôr no palco" no menu do directory
 */

const FLAG_SCOPE   = "pokemon-rpg";
const FLAG_STAGED  = "stagedActors";   // array de uuids
const FLAG_ACTIVE  = "stagedActive";   // uuid ativo
const PORTRAIT_TTL = 6000;             // ms que o avatar grande fica visível

export class Stage {

  /* ---------- Estado ---------- */

  /** Set<string> de UUIDs de atores no palco (em memória, espelha a flag). */
  static _staged = new Set();
  static _activeUuid = null;
  static _portraitTimer = null;

  /** Lê o estado inicial das flags do user (chamado uma vez no ready). */
  static async _load() {
    const list = game.user?.getFlag(FLAG_SCOPE, FLAG_STAGED) ?? [];
    Stage._staged = new Set(list);
    Stage._activeUuid = game.user?.getFlag(FLAG_SCOPE, FLAG_ACTIVE) ?? null;
  }

  static async _save() {
    await game.user?.setFlag(FLAG_SCOPE, FLAG_STAGED, [...Stage._staged]);
    await game.user?.setFlag(FLAG_SCOPE, FLAG_ACTIVE, Stage._activeUuid);
  }

  /** Verifica se um ator está no palco. */
  static isStaged(actor) {
    return !!actor?.uuid && Stage._staged.has(actor.uuid);
  }

  /* ---------- API pública ---------- */

  /** Adiciona o ator ao palco e marca como ativo. */
  static async add(actor) {
    if ( !actor?.uuid ) return;
    Stage._staged.add(actor.uuid);
    Stage._activeUuid = actor.uuid;
    await Stage._save();
    Stage._renderBar();
    ui.notifications?.info(
      game.i18n.format("POKEMON_RPG.Stage.Added", { name: actor.name })
    );
  }

  /** Remove o ator do palco. */
  static async remove(actor) {
    if ( !actor?.uuid ) return;
    Stage._staged.delete(actor.uuid);
    if ( Stage._activeUuid === actor.uuid ) {
      Stage._activeUuid = [...Stage._staged][0] ?? null;
    }
    await Stage._save();
    Stage._renderBar();
    ui.notifications?.info(
      game.i18n.format("POKEMON_RPG.Stage.Removed", { name: actor.name })
    );
  }

  /** Alterna entrada/saída do ator no palco. */
  static async toggle(actor) {
    if ( !actor?.uuid ) return;
    if ( Stage.isStaged(actor) ) return Stage.remove(actor);
    return Stage.add(actor);
  }

  /** Define qual ator é o speaker ativo (clique na barra). */
  static async setActive(uuid) {
    if ( !Stage._staged.has(uuid) ) return;
    Stage._activeUuid = uuid;
    await Stage._save();
    Stage._renderBar();
  }

  /** Limpa o palco inteiro. */
  static async clear() {
    Stage._staged.clear();
    Stage._activeUuid = null;
    await Stage._save();
    Stage._renderBar();
  }

  /* ---------- Inicialização ---------- */

  static async init() {
    await Stage._load();
    Stage._ensureRoot();
    Stage._renderBar();

    // Hook em chat messages — mostra avatar grande quando um actor no
    // palco fala.
    Hooks.on("createChatMessage", (msg) => {
      try {
        const actorId = msg?.speaker?.actor;
        if ( !actorId ) return;
        const actor = game.actors?.get(actorId);
        if ( !actor ) return;
        if ( !Stage.isStaged(actor) ) return;
        // Pula rolls do sistema (são consequência mecânica, não fala).
        if ( msg.rolls?.length ) return;
        Stage._showPortrait(actor, msg);
      } catch (err) {
        console.warn("pokemon-rpg | Stage createChatMessage:", err);
      }
    });

    // Menu de contexto no Actor Directory: "Pôr no palco" / "Tirar do palco".
    Hooks.on("getActorContextOptions", (app, options) => {
      options.push({
        name: "POKEMON_RPG.Stage.Toggle",
        icon: '<i class="fa-solid fa-masks-theater"></i>',
        condition: (li) => {
          const id = li?.dataset?.entryId ?? li?.dataset?.documentId;
          return !!game.actors?.get(id);
        },
        callback: (li) => {
          const id = li?.dataset?.entryId ?? li?.dataset?.documentId;
          const actor = game.actors?.get(id);
          if ( actor ) Stage.toggle(actor);
        }
      });
    });

    // Quando flags do user mudam por outro caminho, re-renderiza barra.
    Hooks.on("updateUser", (user) => {
      if ( user?.id !== game.user?.id ) return;
      Stage._load().then(() => Stage._renderBar());
    });

    // Re-renderiza quando o ator é editado (nome/avatar mudou).
    Hooks.on("updateActor", (actor) => {
      if ( Stage.isStaged(actor) ) Stage._renderBar();
    });
    Hooks.on("deleteActor", (actor) => {
      if ( Stage.isStaged(actor) ) Stage.remove(actor);
    });
  }

  /* ---------- UI ---------- */

  /** Garante que o container raiz da UI exista no body. */
  static _ensureRoot() {
    if ( document.getElementById("pkrpg-stage") ) return;
    const root = document.createElement("div");
    root.id = "pkrpg-stage";
    root.innerHTML = `
      <div id="pkrpg-stage-portrait" class="pkrpg-stage-portrait" aria-hidden="true">
        <div class="pkrpg-stage-portrait-frame">
          <img class="pkrpg-stage-portrait-img" alt="" />
        </div>
        <div class="pkrpg-stage-portrait-bubble">
          <div class="pkrpg-stage-portrait-name"></div>
          <div class="pkrpg-stage-portrait-text"></div>
        </div>
      </div>
      <div id="pkrpg-stage-bar" class="pkrpg-stage-bar" role="toolbar"
           aria-label="Stage">
        <button type="button" class="pkrpg-stage-clear"
                title="Esvaziar palco" data-action="clear">
          <i class="fa-solid fa-xmark"></i>
        </button>
        <div class="pkrpg-stage-actors"></div>
      </div>
    `;
    document.body.appendChild(root);

    // Listeners delegados.
    const bar = root.querySelector("#pkrpg-stage-bar");
    bar.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-action]");
      if ( !btn ) return;
      const action = btn.dataset.action;
      if ( action === "clear" ) Stage.clear();
      else if ( action === "activate" ) Stage.setActive(btn.dataset.uuid);
      else if ( action === "remove" ) {
        const actor = fromUuidSync(btn.dataset.uuid);
        if ( actor ) Stage.remove(actor);
      }
    });
    bar.addEventListener("contextmenu", (ev) => {
      const btn = ev.target.closest('[data-action="activate"]');
      if ( !btn ) return;
      ev.preventDefault();
      const actor = fromUuidSync(btn.dataset.uuid);
      if ( actor ) Stage.remove(actor);
    });
  }

  /** Re-renderiza a barra inferior com os avatares atuais. */
  static _renderBar() {
    Stage._ensureRoot();
    const list = document.querySelector("#pkrpg-stage-bar .pkrpg-stage-actors");
    if ( !list ) return;
    list.innerHTML = "";
    if ( Stage._staged.size === 0 ) {
      document.getElementById("pkrpg-stage-bar")?.classList.add("empty");
      return;
    }
    document.getElementById("pkrpg-stage-bar")?.classList.remove("empty");
    for ( const uuid of Stage._staged ) {
      const actor = fromUuidSync(uuid);
      if ( !actor ) continue;
      const isActive = uuid === Stage._activeUuid;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pkrpg-stage-actor" + (isActive ? " active" : "");
      btn.dataset.action = "activate";
      btn.dataset.uuid = uuid;
      btn.title = `${actor.name} — clique pra ativar, botão direito pra remover`;
      btn.innerHTML = `
        <img src="${actor.img}" alt="${actor.name}" />
        <span class="pkrpg-stage-actor-name">${actor.name}</span>
      `;
      list.appendChild(btn);
    }
  }

  /** Exibe o avatar grande com o texto da mensagem por alguns segundos. */
  static _showPortrait(actor, msg) {
    const root = document.getElementById("pkrpg-stage-portrait");
    if ( !root ) return;
    const img  = root.querySelector(".pkrpg-stage-portrait-img");
    const name = root.querySelector(".pkrpg-stage-portrait-name");
    const text = root.querySelector(".pkrpg-stage-portrait-text");
    img.src = actor.img;
    img.alt = actor.name;
    name.textContent = actor.name;
    // Limpa HTML do content pra texto plano simples.
    const plain = String(msg?.content ?? "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    text.textContent = plain.length > 240 ? plain.slice(0, 237) + "…" : plain;

    // Cor do ator: se for trainer, tenta usar a cor do dono via getter.
    const owner = (game.users ?? []).find(
      u => !u.isGM && actor.testUserPermission(u, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)
    );
    const accent = owner?.color || "#cc0000";
    root.style.setProperty("--pkrpg-stage-accent", String(accent));

    root.classList.add("visible");
    root.setAttribute("aria-hidden", "false");

    if ( Stage._portraitTimer ) clearTimeout(Stage._portraitTimer);
    Stage._portraitTimer = setTimeout(() => {
      root.classList.remove("visible");
      root.setAttribute("aria-hidden", "true");
    }, PORTRAIT_TTL);
  }
}
