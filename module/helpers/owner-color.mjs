/**
 * owner-color.mjs
 *
 * Aplica a cor escolhida pelo usuário-dono do ator como acento da ficha.
 * Sobrescreve as CSS variables --pk-accent, --pk-accent-dark, --pk-accent-soft
 * e os tints, mantendo o resto do design intacto.
 */

/**
 * Encontra o usuário-dono do ator. Procura primeiro um não-GM com permissão
 * OWNER; se não houver, cai pra qualquer GM com OWNER; e por último o user
 * que está vendo a ficha.
 */
function findOwnerUser(actor) {
  const OWNER = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
  const players = (game.users ?? []).filter(u => u.active || true); // todos
  // Prioridade: usuário não-GM com OWNER
  const nonGmOwner = players.find(u => !u.isGM && actor.testUserPermission(u, OWNER));
  if ( nonGmOwner ) return nonGmOwner;
  const gmOwner = players.find(u => u.isGM && actor.testUserPermission(u, OWNER));
  if ( gmOwner ) return gmOwner;
  return game.user;
}

/**
 * Converte um valor de cor (string ou Color) para componentes RGB (0-255).
 */
function colorToRGB(color) {
  if ( !color ) return null;
  let hex = "";
  if ( typeof color === "string" ) {
    hex = color;
  } else if ( typeof color.toString === "function" ) {
    hex = color.toString();
  }
  // Hex format: #RRGGBB ou #RGB
  const m = String(hex).trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if ( !m ) return null;
  let h = m[1];
  if ( h.length === 3 ) h = h.split("").map(c => c + c).join("");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  };
}

/**
 * Mistura uma cor com preto (escurece) ou branco (clareia).
 * @param {number} mix  0 = sem mudança, 1 = totalmente preto/branco
 * @param {boolean} darken  true = mistura com preto, false = mistura com branco
 */
function shade(rgb, mix, darken = true) {
  const t = darken ? 0 : 255;
  return {
    r: Math.round(rgb.r * (1 - mix) + t * mix),
    g: Math.round(rgb.g * (1 - mix) + t * mix),
    b: Math.round(rgb.b * (1 - mix) + t * mix)
  };
}

const toHex = (rgb) =>
  "#" + [rgb.r, rgb.g, rgb.b]
    .map(n => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0"))
    .join("");
const toRgba = (rgb, a) => `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;

/**
 * Aplica a cor do dono do ator como CSS variables na raiz do sheet.
 * Chamar em _onRender.
 */
export function applyOwnerColor(actor, element) {
  if ( !actor || !element ) return;
  const user = findOwnerUser(actor);
  const rgb = colorToRGB(user?.color);
  if ( !rgb ) return;
  const accent     = toHex(rgb);
  const accentDark = toHex(shade(rgb, 0.35, true));   // 35% mais escuro
  const accentSoft = toHex(shade(rgb, 0.45, false));  // 45% mais claro
  const tint       = toRgba(rgb, 0.08);
  const tint2      = toRgba(rgb, 0.16);
  element.style.setProperty("--pk-accent",       accent);
  element.style.setProperty("--pk-accent-dark",  accentDark);
  element.style.setProperty("--pk-accent-soft",  accentSoft);
  element.style.setProperty("--pk-accent-tint",  tint);
  element.style.setProperty("--pk-accent-tint2", tint2);
}
