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
 * Rola um golpe de pokémon — molde do Livro do Jogador.
 *
 * Estrutura:
 *  - Frequência: golpe pode estar em cooldown (rastreado por `system.usado`).
 *    À Vontade → nunca trava;
 *    Rodada Sim Rodada Não → trava 1 rodada (uso seguinte só após próxima Recuperação);
 *    Por Encontro → trava até fim de encontro;
 *    Diária → trava até descanso longo.
 *    Aqui apenas marcamos `usado=true` exceto À Vontade. Reset é manual via botão.
 *
 *  - Acurácia: 1d20 puro vs. dificuldade + evasão do alvo. "Automática" ignora rolagem.
 *    20 = Crítico. 1 = Falha Crítica.
 *
 *  - Dano Basal: fórmula como string (ex.: "5d12+18"). Soma Atk se físico ou SpA se especial.
 *    A categoria do livro vem de "Físico"/"Especial" no Dano Basal.
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
  content += `<span class="type-badge type-${moveType}">${game.i18n.localize(POKEMON_RPG.types[moveType])}</span>`;
  if ( cat && cat !== "status" ) {
    content += `<span class="cat-badge cat-${cat}">${game.i18n.localize(POKEMON_RPG.moveCategories[cat])}</span>`;
  }
  // Frequência
  const freqLabel = game.i18n.localize(POKEMON_RPG.frequencies?.[sys.frequencia] ?? sys.frequencia);
  content += `<span class="freq-badge">${freqLabel}</span>`;
  content += `</div></header>`;

  // 0. Verifica frequência: golpe já usado e ainda travado?
  if ( sys.frequencia !== "at-will" && sys.usado ) {
    content += `<p class="warning">Golpe ainda em cooldown (${freqLabel}). Aguarde recuperar.</p>`;
    await ChatMessage.create({ speaker, content });
    return null;
  }

  // Marca como usado (exceto À Vontade)
  if ( sys.frequencia !== "at-will" ) {
    await moveItem.update({ "system.usado": true });
  }

  // 1. Rolagem de Acurácia. Se accuracy = null, é Acurácia Automática.
  let hit = true;
  let crit = false;
  let critFail = false;

  // Coleta o alvo uma vez — usado tanto pra evasão quanto pra defesa do dano.
  const targets = Array.from(game.user?.targets ?? []);
  const targetActor = targets[0]?.actor ?? null;

  const automatic = (sys.accuracy === null || sys.accuracy === undefined);
  if ( !automatic ) {
    const accRoll = new Roll("1d20");
    await accRoll.evaluate();
    const d20 = accRoll.total;

    // Evasão
    let evasion = 0;
    let evasionLabel = "—";
    if ( targetActor ) {
      const ev = targetActor.system.evasion ?? { physical: 0, special: 0, fast: 0 };
      const physEv = ev.physical ?? 0;
      const specEv = ev.special  ?? 0;
      const fastEv = ev.fast     ?? 0;
      let baseEv, baseLabel;
      if ( cat === "special" ) {
        baseEv = specEv;
        baseLabel = game.i18n.localize("POKEMON_RPG.Evasion.Special");
      } else {
        baseEv = physEv;
        baseLabel = game.i18n.localize("POKEMON_RPG.Evasion.Physical");
      }
      if ( fastEv > physEv && fastEv > specEv ) {
        evasion = fastEv;
        evasionLabel = game.i18n.localize("POKEMON_RPG.Evasion.Fast");
      } else {
        evasion = baseEv;
        evasionLabel = baseLabel;
      }
    }

    const dc = (sys.accuracy ?? 0) + evasion;
    hit = d20 >= dc;
    crit = (d20 === 20);     // Crítico
    critFail = (d20 === 1);  // Falha Crítica
    if ( crit ) hit = true;
    if ( critFail ) hit = false;

    const targetName = targetActor?.name ?? "sem alvo";
    let resText;
    if ( crit ) resText = "💥 CRÍTICO";
    else if ( critFail ) resText = "💢 FALHA CRÍTICA";
    else resText = hit ? "✅ acertou" : "❌ errou";

    content += `<div class="accuracy-roll">`;
    content += `Acerto (1d20): <strong>${d20}</strong> vs <strong>${dc}</strong> `;
    content += `<em>(Dif. ${sys.accuracy ?? 0} + ${evasionLabel} ${evasion} — alvo: ${targetName})</em> — ${resText}`;
    content += `</div>`;
  } else {
    content += `<div class="accuracy-roll"><em>Acurácia Automática — golpe acerta sem rolagem.</em></div>`;
  }

  // 2. Dano Basal (do livro)
  //
  // Cálculo final do dano:
  //   1. Rola a fórmula de Dano Basal + atributo de ataque do usuário.
  //   2. Aplica multiplicador de Crítico (×2) se houver.
  //   3. SUBTRAI a Defesa (físico) ou Defesa Especial (especial) do alvo.
  //   4. Aplica o multiplicador de efetividade de tipo (×0.5, ×1, ×2 etc.)
  //      no DANO RESTANTE (a defesa reduz primeiro, depois resistência/fraqueza).
  //
  const damageFormula = sys.damageBasal?.trim() || sys.damageFormula?.trim() || "";
  const hasDamage = hit && damageFormula && damageFormula !== "-" && damageFormula !== "Ver Efeito"
                    && cat !== "status";
  if ( hasDamage ) {
    const attrKey = (cat === "physical") ? "atk" : "spa";
    const attrVal = actor.system.attributes?.[attrKey]?.mod ?? 0;
    let formula = damageFormula;
    // Soma atributo do usuário ao dano basal.
    if ( attrVal !== 0 ) formula = `${formula} + ${attrVal}`;
    // Crítico dobra o dano (regra padrão Pokémon).
    if ( crit ) formula = `(${formula}) * 2`;

    const dmgRoll = new Roll(formula);
    await dmgRoll.evaluate();
    const rolled = dmgRoll.total;

    // 2.1. Coleta Defesa do alvo conforme categoria do golpe.
    const defKey   = (cat === "special") ? "spd" : "def";
    const defLabel = (cat === "special")
      ? game.i18n.localize("POKEMON_RPG.Attribute.SpD")
      : game.i18n.localize("POKEMON_RPG.Attribute.Def");
    const targetDef = targetActor?.system?.attributes?.[defKey]?.value ?? 0;

    // 2.2. Aplica defesa: max(0, rolado - defesa).
    const afterDef = Math.max(0, rolled - targetDef);

    // 2.3. Efetividade de tipo (fraqueza/resistência/imunidade).
    let effMult = 1;
    let effLabel = "×1";
    if ( targetActor && typeof targetActor.system?.getTypeEffectiveness === "function" ) {
      effMult = targetActor.system.getTypeEffectiveness(moveType);
      if ( effMult === 0 )         effLabel = "imune";
      else if ( effMult === 0.25 ) effLabel = "×¼";
      else if ( effMult === 0.5 )  effLabel = "×½";
      else if ( effMult === 2 )    effLabel = "×2";
      else if ( effMult === 4 )    effLabel = "×4";
      else                         effLabel = `×${effMult}`;
    }

    // 2.4. Dano final aplicado ao alvo.
    const finalDmg = Math.floor(afterDef * effMult);

    // Renderização do bloco de dano com cada etapa visível.
    content += `<div class="damage-roll">`;
    content += `<div class="dmg-line dmg-rolled">`;
    content +=   `Dano rolado${crit ? " (Crítico ×2)" : ""}: <strong>${rolled}</strong> `;
    content +=   `<em>(${formula})</em>`;
    content += `</div>`;
    if ( targetActor ) {
      content += `<div class="dmg-line dmg-defense">`;
      content +=   `− ${defLabel} (${targetDef}) = <strong>${afterDef}</strong>`;
      content += `</div>`;
      if ( effMult !== 1 ) {
        const effClass = effMult > 1 ? "dmg-weak"
                       : effMult === 0 ? "dmg-immune"
                       : "dmg-resist";
        content += `<div class="dmg-line dmg-effective ${effClass}">`;
        content +=   `× Efetividade (${effLabel}) = <strong>${finalDmg}</strong>`;
        content += `</div>`;
      }
      content += `<div class="dmg-line dmg-total">`;
      content +=   `<strong>Dano final ao ${targetActor.name}: ${finalDmg}</strong>`;
      content += `</div>`;
    } else {
      content += `<div class="dmg-line"><em>Sem alvo selecionado — defesa e efetividade não aplicadas.</em></div>`;
    }
    content += `</div>`;
    content += `<details><summary>Detalhes da rolagem</summary>${await dmgRoll.render()}</details>`;
  } else if ( damageFormula === "Ver Efeito" ) {
    content += `<div class="damage-roll">Dano descrito no Efeito.</div>`;
  } else if ( cat === "status" || !damageFormula || damageFormula === "-" ) {
    content += `<div class="status-effect">Golpe sem Dano Basal — ver efeito.</div>`;
  }

  // 3. Descritores (badges adicionais)
  if ( Array.isArray(sys.descritores) && sys.descritores.length > 0 ) {
    content += `<div class="move-descritores">`;
    for ( const d of sys.descritores ) {
      content += `<span class="desc-badge">${d}</span>`;
    }
    content += `</div>`;
  }

  // 4. Efeito textual
  if ( sys.effect ) {
    content += `<div class="effect">${sys.effect}</div>`;
  }

  // Footer com alcance
  const alcanceTxt = game.i18n.localize(POKEMON_RPG.ranges?.[sys.alcance] ?? sys.alcance ?? "");
  const alcanceFull = sys.alcance === "ranged" && sys.alcanceRange
    ? `${alcanceTxt} ${sys.alcanceRange}m`
    : alcanceTxt;
  content += `<footer><small>Alcance: ${alcanceFull}</small></footer>`;
  content += `</div>`;

  await ChatMessage.create({ speaker, content });
}

/**
 * Reseta o estado de uso (frequência) de todos os golpes de um Pokémon.
 * Útil para "fim do encontro" (Por Encontro + Rodada Sim Rodada Não)
 * e "descanso" (Diária).
 */
export async function resetMoveUsage(actor, scope = "encounter") {
  if ( !actor ) return;
  const moves = actor.items.filter(i => i.type === "move");
  const updates = [];
  for ( const m of moves ) {
    const f = m.system.frequencia;
    if ( f === "at-will" ) continue;
    if ( scope === "encounter" && (f === "per-encounter" || f === "every-other") ) {
      updates.push({ _id: m.id, "system.usado": false });
    } else if ( scope === "daily" ) {
      updates.push({ _id: m.id, "system.usado": false });
    }
  }
  if ( updates.length ) await actor.updateEmbeddedDocuments("Item", updates);
  ui.notifications?.info(`${updates.length} golpe(s) recuperado(s).`);
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
