/**
 * ball-roll.mjs
 *
 * Roll automático de Pokébolas conforme regras do Livro do Jogador (p. 17-19):
 *
 *   1. O jogador rola 1d100 + modificador da pokébola.
 *   2. O Narrador compara o resultado com a Chance de Captura do alvo,
 *      modificada por circunstâncias:
 *        +25  se o alvo está com 1 PV
 *        +5   se o alvo está com menos de 50% PV (não cumulativo com 1 PV)
 *        +20  se o alvo é de Nível inferior a 21
 *   3. Se a rolagem do jogador for MENOR que a Chance de Captura modificada,
 *      a captura é bem-sucedida.
 *
 * Esta função abre um DialogV2 que coleta os fatores e posta o resultado no chat.
 */

/**
 * Tenta achar um Pokémon "alvo" pra pré-popular o dialog:
 * 1. Token controlado (selecionado no canvas);
 * 2. Token alvo (targeted);
 * 3. Primeiro Pokémon selvagem aberto.
 */
function _autoDetectTarget() {
  const controlled = canvas?.tokens?.controlled?.[0]?.actor;
  if ( controlled?.type === "pokemon" ) return controlled;
  const targeted = [...(game.user?.targets ?? [])][0]?.actor;
  if ( targeted?.type === "pokemon" ) return targeted;
  return null;
}

/**
 * Lê a Chance de Captura base do ator alvo.
 * Procura em `system.species.chanceCaptura` (preenchido ao aplicar a espécie).
 * Default = 40 se não encontrar.
 */
function _baseCaptureChance(actor) {
  if ( !actor ) return 40;
  const sys = actor.system ?? {};
  return Number(sys.species?.chanceCaptura ?? sys.chanceCaptura ?? 40);
}

/** Lê o HP atual e o máximo do alvo. */
function _hpState(actor) {
  const hp = actor?.system?.attributes?.hp ?? actor?.system?.hp ?? {};
  return { value: Number(hp.value ?? 0), max: Number(hp.max ?? 1) };
}

/** Lê o nível do alvo (default 1). */
function _level(actor) {
  return Number(actor?.system?.details?.level ?? 1);
}

/**
 * Calcula sugestões automáticas dos bônus circunstanciais com base no alvo.
 * Retorna { lowHP, criticalHP, lowLevel } como booleanos.
 */
function _suggestFlags(target) {
  if ( !target ) return { criticalHP: false, lowHP: false, lowLevel: false };
  const { value, max } = _hpState(target);
  const lvl = _level(target);
  return {
    criticalHP: value === 1,
    lowHP:      value > 1 && (value / Math.max(1, max)) < 0.5,
    lowLevel:   lvl < 21
  };
}

/**
 * Abre o dialog e dispara o roll. `ballItem` é o Item do tipo "item" com
 * categoria "ball".
 */
export async function rollBallCapture(ballItem) {
  if ( !ballItem || ballItem.system?.category !== "ball" ) {
    ui.notifications?.warn("Esse item não é uma Pokébola.");
    return;
  }

  const target = _autoDetectTarget();
  const baseCC = _baseCaptureChance(target);
  const flags  = _suggestFlags(target);
  const ballMod = Number(ballItem.system.modifier ?? 0);
  const ballName = ballItem.name;

  // Render do dialog.
  const content = `
    <form class="pkrpg-ball-dialog" style="display:flex;flex-direction:column;gap:8px">
      <p style="margin:0;font-size:0.9em;color:#555">
        <strong>${ballName}</strong> — modificador do roll: <strong>${ballMod >= 0 ? '+'+ballMod : ballMod}</strong>
      </p>
      <label>
        Alvo: <strong>${target ? target.name : "(nenhum selecionado/atacado)"}</strong>
      </label>
      <label>Chance de Captura base do alvo:
        <input type="number" name="baseCC" value="${baseCC}" min="0" max="100" step="1" style="width:90px"/>
      </label>
      <hr/>
      <p style="margin:0;font-size:0.85em;color:#777">Bônus circunstanciais (aumentam a Chance de Captura):</p>
      <label><input type="checkbox" name="criticalHP" ${flags.criticalHP ? "checked" : ""}/> Alvo com 1 PV (+25)</label>
      <label><input type="checkbox" name="lowHP"      ${flags.lowHP      ? "checked" : ""}/> Alvo com &lt; 50% PV (+5)</label>
      <label><input type="checkbox" name="lowLevel"   ${flags.lowLevel   ? "checked" : ""}/> Alvo de Nível &lt; 21 (+20)</label>
      <label>Bônus adicional (manual):
        <input type="number" name="customBonus" value="0" step="1" style="width:90px"/>
      </label>
    </form>
  `;

  const result = await foundry.applications.api.DialogV2.prompt({
    window: { title: `Captura: ${ballName}` },
    content,
    ok: {
      label: "Jogar Pokébola!",
      icon: "fas fa-bullseye",
      callback: (_ev, button) => {
        const fd = new FormData(button.form);
        return {
          baseCC:      Number(fd.get("baseCC")) || 0,
          criticalHP:  fd.get("criticalHP") === "on",
          lowHP:       fd.get("lowHP") === "on",
          lowLevel:    fd.get("lowLevel") === "on",
          customBonus: Number(fd.get("customBonus")) || 0
        };
      }
    },
    rejectClose: false
  });
  if ( !result ) return;

  // Calcula CC modificada.
  let cc = result.baseCC;
  const breakdown = [`base ${result.baseCC}`];
  if ( result.criticalHP ) { cc += 25; breakdown.push("+25 (1 PV)"); }
  else if ( result.lowHP ) { cc += 5;  breakdown.push("+5 (<50% PV)"); }
  if ( result.lowLevel )   { cc += 20; breakdown.push("+20 (Nível < 21)"); }
  if ( result.customBonus ) {
    cc += result.customBonus;
    breakdown.push(`${result.customBonus >= 0 ? "+" : ""}${result.customBonus} (bônus)`);
  }

  // Roll 1d100 + modifier.
  const roll = new Roll(`1d100 + ${ballMod}`);
  await roll.evaluate();
  const total = roll.total;
  const success = total < cc;

  const verdict = success
    ? `<strong style="color:#1B8A3E">✓ CAPTURA BEM-SUCEDIDA</strong>`
    : `<strong style="color:#B91C1C">✗ Falhou (pokébola sacode e abre)</strong>`;

  const html = `
    <div class="pkrpg-ball-roll" style="border:1px solid #ccc;border-radius:6px;padding:8px">
      <h3 style="margin:0 0 4px;font-size:1em">${ballName}</h3>
      <p style="margin:2px 0;font-size:0.9em">
        Alvo: <strong>${target ? target.name : "—"}</strong>
        — Chance de Captura: <strong>${cc}</strong>
        <span style="color:#777">(${breakdown.join(", ")})</span>
      </p>
      <p style="margin:2px 0;font-size:0.9em">
        Roll: <strong>1d100 ${ballMod >= 0 ? "+ " + ballMod : "- " + Math.abs(ballMod)}</strong>
        = <strong>${total}</strong>
      </p>
      <p style="margin:4px 0 0">${verdict}</p>
    </div>
  `;

  await roll.toMessage({
    speaker: ChatMessage.getSpeaker(),
    flavor: html,
    flags: { "pokemon-rpg": { type: "ballRoll", success } }
  });
}
