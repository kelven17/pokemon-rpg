import { POKEMON_RPG } from "./config.mjs";

/**
 * Rola uma perícia do treinador.
 * Fórmula: 1d20 + skill.mod (já contém atributo + proficiência + bônus).
 */
export async function rollSkill(actor, skillKey, options = {}) {
  const skill = actor.system.skills?.[skillKey];
  if ( !skill ) {
    ui.notifications?.error(`Perícia desconhecida: ${skillKey}`);
    return null;
  }
  const cfg = POKEMON_RPG.skills[skillKey];
  const label = game.i18n.localize(cfg.label);
  const attrLabel = game.i18n.localize(POKEMON_RPG.attributes[cfg.attribute]);

  const formula = `1d20 + ${skill.mod}`;
  const roll = new Roll(formula);
  await roll.evaluate();

  const flavor = `<strong>${label}</strong> <em>(${attrLabel})</em>`;
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor
  });
  return roll;
}

/**
 * Rola um atributo bruto. Para treinadores, usa modificador (1d20 + mod).
 * Para pokémons, usa o valor (1d20 + value).
 */
export async function rollAttribute(actor, attrKey, options = {}) {
  const attr = actor.system.attributes?.[attrKey];
  if ( !attr ) {
    ui.notifications?.error(`Atributo desconhecido: ${attrKey}`);
    return null;
  }
  const label = game.i18n.localize(POKEMON_RPG.attributes[attrKey]);

  // Treinador usa mod; pokémon já tem mod = value.
  const bonus = attr.mod;
  const roll = new Roll(`1d20 + ${bonus}`);
  await roll.evaluate();

  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `<strong>Teste de ${label}</strong>`
  });
  return roll;
}

/**
 * Rola um golpe de pokémon.
 *
 * Acerto:
 *   Rola 1d20 puro.
 *   O golpe acerta se o resultado for >= accuracy + evasão do alvo.
 *   A evasão usada é:
 *     - Evasão Física  (def) se o golpe for físico
 *     - Evasão Especial (spd) se o golpe for especial
 *     - PORÉM, se a Evasão Veloz (spe) do alvo for a maior evasão dele,
 *       é ela quem é usada no lugar.
 *
 * Dano: como antes (power/10 d6 + atributo apropriado), só rola se acertar.
 */
export async function rollMove(actor, moveItem, options = {}) {
  const sys = moveItem.system;
  const moveName = moveItem.name;
  const moveType = sys.type;
  const cat = sys.category;

  const speaker = ChatMessage.getSpeaker({ actor });
  let content = `<div class="pokemon-rpg move-card">`;
  content += `<header><h3>${moveName}</h3>`;
  content += `<div class="move-tags">`;
  content += `<span class="type type-${moveType}">${game.i18n.localize(POKEMON_RPG.types[moveType])}</span>`;
  content += `<span class="category">${game.i18n.localize(POKEMON_RPG.moveCategories[cat])}</span>`;
  content += `</div></header>`;

  // PP check
  if ( sys.pp.value <= 0 ) {
    content += `<p class="warning">Sem PP restante!</p>`;
    await ChatMessage.create({ speaker, content });
    return null;
  }

  // Consumir PP
  await moveItem.update({ "system.pp.value": Math.max(0, sys.pp.value - 1) });

  // 1. Rolagem de acerto: 1d20 puro vs accuracy + evasão do alvo.
  let hit = true;
  if ( sys.accuracy !== null && sys.accuracy !== undefined ) {
    const accRoll = new Roll(`1d20`);
    await accRoll.evaluate();

    // Pega o primeiro alvo selecionado pelo usuário, se houver.
    const targets = Array.from(game.user?.targets ?? []);
    const targetActor = targets[0]?.actor ?? null;

    let evasion = 0;
    let evasionLabel = "—";

    if ( targetActor ) {
      // Lê evasões derivadas do system (calculadas em prepareDerivedData).
      // Funciona tanto para Pokémon quanto para Treinador.
      const ev = targetActor.system.evasion ?? { physical: 0, special: 0, fast: 0 };
      const physEv = ev.physical ?? 0;
      const specEv = ev.special  ?? 0;
      const fastEv = ev.fast     ?? 0;

      // Evasão "padrão" baseada na categoria do golpe.
      let baseEv, baseLabel;
      if ( cat === "special" ) {
        baseEv = specEv;
        baseLabel = game.i18n.localize("POKEMON_RPG.Evasion.Special");
      } else {
        // Físico e status usam evasão física por padrão.
        baseEv = physEv;
        baseLabel = game.i18n.localize("POKEMON_RPG.Evasion.Physical");
      }

      // Se Evasão Veloz é a MAIOR de todas, ela substitui a base.
      if ( fastEv > physEv && fastEv > specEv ) {
        evasion = fastEv;
        evasionLabel = game.i18n.localize("POKEMON_RPG.Evasion.Fast");
      } else {
        evasion = baseEv;
        evasionLabel = baseLabel;
      }
    }

    const dc = (sys.accuracy ?? 0) + evasion;
    hit = accRoll.total >= dc;

    const targetName = targetActor?.name ?? "sem alvo";
    content += `<div class="accuracy-roll">`;
    content += `Acerto (1d20): <strong>${accRoll.total}</strong> vs <strong>${dc}</strong> `;
    content += `<em>(Precisão ${sys.accuracy ?? 0} + ${evasionLabel} ${evasion} — alvo: ${targetName})</em> `;
    content += `— ${hit ? "✅ acertou" : "❌ errou"}`;
    content += `</div>`;
  }

  // 2. Rolagem de dano
  if ( hit && sys.power && cat !== "status" ) {
    const attrKey = (cat === "physical") ? "atk" : "spa";
    const attrVal = actor.system.attributes[attrKey]?.mod ?? 0;
    const diceCount = Math.max(1, Math.ceil(sys.power / 10));
    const formula = sys.damageFormula?.trim() || `${diceCount}d6 + ${attrVal}`;
    const dmgRoll = new Roll(formula);
    await dmgRoll.evaluate();
    content += `<div class="damage-roll">Dano: <strong>${dmgRoll.total}</strong> <em>(${formula})</em></div>`;
    // Anexa o detalhe do roll no chat (tooltip).
    content += `<details><summary>Detalhes do dano</summary>${await dmgRoll.render()}</details>`;
  } else if ( cat === "status" ) {
    content += `<div class="status-effect">Golpe de status — sem dano direto.</div>`;
  }

  // 3. Efeito textual
  if ( sys.effect ) {
    content += `<div class="effect">${sys.effect}</div>`;
  }

  content += `<footer><small>PP restante: ${Math.max(0, sys.pp.value - 1)}/${sys.pp.max}</small></footer>`;
  content += `</div>`;

  await ChatMessage.create({ speaker, content });
}

/**
 * Posta um card descritivo de um item (talento, habilidade, etc).
 */
export async function postItemCard(actor, item) {
  const sys = item.system;
  const speaker = ChatMessage.getSpeaker({ actor });
  let content = `<div class="pokemon-rpg item-card">`;
  content += `<header><h3>${item.name}</h3><em>${game.i18n.localize(`POKEMON_RPG.ItemType.${item.type}`)}</em></header>`;
  if ( sys.description ) content += `<div class="description">${sys.description}</div>`;
  content += `</div>`;
  await ChatMessage.create({ speaker, content });
}
