/**
 * v1-compat.mjs
 *
 * Compatibilidade com módulos que esperam o ciclo de vida do ActorSheet V1
 * (Theatre Inserts, Token Action HUD legado, etc.). ApplicationV2 não dispara
 * automaticamente os hooks `renderActorSheet` / `getActorSheetHeaderButtons`,
 * então fazemos isso manualmente após o render do nosso sheet.
 *
 * Theatre Inserts (League of Foundry Developers fork) precisa de:
 *   - hook `renderActorSheet(app, html, data)` com `html` em jQuery
 *   - propriedade `app.actor` (já temos via ActorSheetV2)
 *   - botão "Add to Stage" injetado no header — fornecido pelo módulo,
 *     desde que o hook seja chamado
 */

/**
 * Dispara os hooks de compatibilidade V1 após o render do sheet.
 * Deve ser chamado de dentro do `_onRender` da subclasse.
 *
 * @param {ApplicationV2} app      O sheet (this).
 * @param {HTMLElement}   element  Raiz do sheet (this.element).
 * @param {object}        context  Contexto de render.
 */
export function fireV1Hooks(app, element, context) {
  if ( !app || !element ) return;
  try {
    // Theatre Inserts e outros módulos V1 esperam jQuery. Foundry expõe $ global.
    const $html = (typeof window !== "undefined" && typeof window.$ === "function")
      ? window.$(element)
      : element;

    // 1. Hook genérico de render do ActorSheet.
    Hooks.callAll("renderActorSheet", app, $html, context);

    // 2. Hook específico do nome da classe (alguns módulos usam).
    const cls = app.constructor?.name;
    if ( cls ) Hooks.callAll(`render${cls}`, app, $html, context);

    // 3. Header buttons - alguns módulos (incluindo Theatre) injetam botões
    //    no header via `getActorSheetHeaderButtons`. Replicamos coletando
    //    e adicionando ao header do sheet V2.
    const buttons = [];
    Hooks.callAll("getActorSheetHeaderButtons", app, buttons);
    if ( buttons.length ) _injectHeaderButtons(app, element, buttons);
  } catch (err) {
    console.warn("pokemon-rpg | v1-compat: erro ao disparar hooks:", err);
  }
}

/**
 * Injeta botões V1 (`{ label, class, icon, onclick }`) no header do
 * ApplicationV2. Evita duplicação verificando data-v1-button no DOM.
 */
function _injectHeaderButtons(app, element, buttons) {
  const header = element.querySelector(".window-header");
  if ( !header ) return;
  // Encontra o ponto de inserção — antes do botão de fechar.
  const closeBtn = header.querySelector('[data-action="close"]');
  for ( const btn of buttons ) {
    if ( !btn || !btn.class ) continue;
    const flag = `v1-${btn.class}`;
    if ( header.querySelector(`[data-v1-button="${flag}"]`) ) continue;
    const a = document.createElement("button");
    a.type = "button";
    a.classList.add("header-control", "icon", "fa-solid");
    if ( btn.icon ) {
      // btn.icon vem como "fas fa-mask" — converte pra classes individuais.
      btn.icon.split(/\s+/).forEach(c => c && a.classList.add(c));
    }
    a.setAttribute("data-v1-button", flag);
    a.setAttribute("data-tooltip", btn.label ?? btn.class);
    a.setAttribute("aria-label", btn.label ?? btn.class);
    if ( typeof btn.onclick === "function" ) {
      a.addEventListener("click", (ev) => {
        ev.preventDefault();
        try { btn.onclick.call(app, ev); }
        catch (err) { console.warn("pokemon-rpg | v1-compat: erro no onclick:", err); }
      });
    }
    if ( closeBtn ) header.insertBefore(a, closeBtn);
    else header.appendChild(a);
  }
}
