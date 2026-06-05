import { POKEMON_RPG } from "./helpers/config.mjs";
import { TrainerData } from "./data/actor-trainer.mjs";
import { PokemonData } from "./data/actor-pokemon.mjs";
import {
  MoveData, TalentData, ClassData,
  AbilityData, CapacityData, SpeciesData
} from "./data/items.mjs";
import { PokemonActor } from "./documents/actor.mjs";
import { PokemonItem } from "./documents/item.mjs";
import { TrainerSheet } from "./sheets/trainer-sheet.mjs";
import { PokemonSheet } from "./sheets/pokemon-sheet.mjs";
import { PokemonItemSheet } from "./sheets/item-sheet.mjs";
import {
  registerMoveImporterSettings,
  importMovesIfNeeded,
  forceReimportMoves
} from "./setup/moves-importer.mjs";
import {
  registerAbilityImporterSettings,
  importAbilitiesIfNeeded,
  forceReimportAbilities
} from "./setup/abilities-importer.mjs";
import {
  registerCapacityImporterSettings,
  importCapacitiesIfNeeded,
  forceReimportCapacities
} from "./setup/capacities-importer.mjs";
import {
  registerSpeciesImporterSettings,
  importSpeciesIfNeeded,
  forceReimportSpecies
} from "./setup/species-importer.mjs";
import {
  registerTalentImporterSettings,
  importTalentsIfNeeded,
  forceReimportTalents
} from "./setup/talents-importer.mjs";
import {
  registerClassImporterSettings,
  importClassesIfNeeded,
  forceReimportClasses
} from "./setup/classes-importer.mjs";
import { learnMovesForLevelRange } from "./helpers/learn-moves.mjs";
import { Stage } from "./theatre/stage.mjs";

/* -------------------------------------------- */
/*  Init                                         */
/* -------------------------------------------- */

Hooks.once("init", function() {
  console.log("pokemon-rpg | Inicializando sistema Pokémon RPG");

  // Expor config no game.
  game.pokemonRpg = {
    config: POKEMON_RPG,
    PokemonActor,
    PokemonItem,
    reimportMoves: forceReimportMoves,
    reimportAbilities: forceReimportAbilities,
    reimportCapacities: forceReimportCapacities,
    reimportSpecies: forceReimportSpecies,
    reimportTalents: forceReimportTalents,
    reimportClasses: forceReimportClasses
  };

  // Registra settings dos importers.
  registerMoveImporterSettings();
  registerAbilityImporterSettings();
  registerCapacityImporterSettings();
  registerSpeciesImporterSettings();
  registerTalentImporterSettings();
  registerClassImporterSettings();
  CONFIG.POKEMON_RPG = POKEMON_RPG;

  // Document classes.
  CONFIG.Actor.documentClass = PokemonActor;
  CONFIG.Item.documentClass = PokemonItem;

  // DataModels.
  CONFIG.Actor.dataModels = {
    trainer: TrainerData,
    pokemon: PokemonData
  };
  CONFIG.Item.dataModels = {
    move:     MoveData,
    talent:   TalentData,
    class:    ClassData,
    ability:  AbilityData,
    capacity: CapacityData,
    species:  SpeciesData
  };

  // Sheets — API moderna v13/v14 via DocumentSheetConfig.
  foundry.documents.collections.Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet);
  foundry.documents.collections.Actors.registerSheet("pokemon-rpg", TrainerSheet, {
    types: ["trainer"],
    makeDefault: true,
    label: "POKEMON_RPG.Sheet.Trainer"
  });
  foundry.documents.collections.Actors.registerSheet("pokemon-rpg", PokemonSheet, {
    types: ["pokemon"],
    makeDefault: true,
    label: "POKEMON_RPG.Sheet.Pokemon"
  });

  foundry.documents.collections.Items.unregisterSheet("core", foundry.appv1.sheets.ItemSheet);
  foundry.documents.collections.Items.registerSheet("pokemon-rpg", PokemonItemSheet, {
    makeDefault: true,
    label: "POKEMON_RPG.Sheet.Item"
  });

  // Helper Handlebars úteis.
  Handlebars.registerHelper("signed", (n) => {
    const v = Number(n) || 0;
    return v >= 0 ? `+${v}` : `${v}`;
  });
  Handlebars.registerHelper("typeColor", (type) => {
    const colors = {
      normal: "#A8A77A", fire: "#EE8130", water: "#6390F0", grass: "#7AC74C",
      electric: "#F7D02C", ice: "#96D9D6", fighting: "#C22E28", poison: "#A33EA1",
      ground: "#E2BF65", flying: "#A98FF3", psychic: "#F95587", bug: "#A6B91A",
      rock: "#B6A136", ghost: "#735797", dragon: "#6F35FC", dark: "#705746",
      steel: "#B7B7CE", fairy: "#D685AD"
    };
    return colors[type] ?? "#888";
  });
  Handlebars.registerHelper("localize", (key) => game.i18n.localize(key));
  Handlebars.registerHelper("eq", (a, b) => a === b);
  Handlebars.registerHelper("neq", (a, b) => a !== b);
  Handlebars.registerHelper("concat", (...args) => {
    args.pop(); // remove options object
    return args.join("");
  });
  Handlebars.registerHelper("capitalize", (s) => {
    if ( typeof s !== "string" ) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
  });
  Handlebars.registerHelper("join", (arr, sep) => {
    if ( !Array.isArray(arr) ) return "";
    return arr.join(typeof sep === "string" ? sep : ", ");
  });
  Handlebars.registerHelper("or", (...args) => {
    args.pop(); // options
    return args.some(Boolean);
  });
  Handlebars.registerHelper("gt", (a, b) => Number(a) > Number(b));
  Handlebars.registerHelper("lt", (a, b) => Number(a) < Number(b));
  Handlebars.registerHelper("gte", (a, b) => Number(a) >= Number(b));
  Handlebars.registerHelper("lte", (a, b) => Number(a) <= Number(b));

  // Carregar partials uma vez.
  loadTemplates([
    "systems/pokemon-rpg/templates/partials/tabs.hbs",
    "systems/pokemon-rpg/templates/partials/attribute-block.hbs",
    "systems/pokemon-rpg/templates/partials/talent-card.hbs"
  ]);
});

/* -------------------------------------------- */
/*  Ready                                        */
/* -------------------------------------------- */

Hooks.once("ready", async function() {
  console.log("pokemon-rpg | Sistema pronto");
  // Auto-import dos golpes (apenas GM, idempotente via setting).
  try {
    await importMovesIfNeeded();
  } catch (err) {
    console.error("pokemon-rpg | erro no import de golpes:", err);
  }
  // Auto-import das habilidades.
  try {
    await importAbilitiesIfNeeded();
  } catch (err) {
    console.error("pokemon-rpg | erro no import de habilidades:", err);
  }
  // Auto-import das capacidades.
  try {
    await importCapacitiesIfNeeded();
  } catch (err) {
    console.error("pokemon-rpg | erro no import de capacidades:", err);
  }
  // Auto-import das espécies (depende dos outros).
  try {
    await importSpeciesIfNeeded();
  } catch (err) {
    console.error("pokemon-rpg | erro no import de espécies:", err);
  }
  // Auto-import das classes.
  try {
    await importClassesIfNeeded();
  } catch (err) {
    console.error("pokemon-rpg | erro no import de classes:", err);
  }
  // Auto-import dos talentos (geral + classes + características).
  try {
    await importTalentsIfNeeded();
  } catch (err) {
    console.error("pokemon-rpg | erro no import de talentos:", err);
  }
  // Inicializa o palco de avatares.
  try {
    await Stage.init();
    game.pokemonRpg.stage = Stage;
  } catch (err) {
    console.error("pokemon-rpg | erro ao iniciar Stage:", err);
  }
});

/* -------------------------------------------- */
/*  Actor creation defaults                       */
/* -------------------------------------------- */

Hooks.on("preCreateActor", (actor, data, options, userId) => {
  // Token configs default.
  const updates = {};
  if ( actor.type === "pokemon" ) {
    updates["prototypeToken.actorLink"] = false;
    updates["prototypeToken.disposition"] = CONST.TOKEN_DISPOSITIONS.NEUTRAL;
  } else if ( actor.type === "trainer" ) {
    updates["prototypeToken.actorLink"] = true;
    updates["prototypeToken.disposition"] = CONST.TOKEN_DISPOSITIONS.FRIENDLY;
  }
  if ( Object.keys(updates).length ) actor.updateSource(updates);
});

/* -------------------------------------------- */
/*  Aplicação de Natureza nos atributos          */
/* -------------------------------------------- */

/**
 * Quando a natureza de um Pokémon muda, ajusta os valores dos atributos
 * removendo o delta da natureza antiga e aplicando o delta da nova.
 *
 * Cada natureza concede +2 no atributo `up` e -2 no `down`. Naturezas
 * neutras (Hardy, Docile, etc.) não têm modificadores.
 *
 * O sheet pode passar `options.pkrpgSkipNatureHook = true` quando ele já
 * computou e gravou os values com o delta incluso (ex.: aplicação de espécie),
 * pra evitar que esse hook reaplique o ajuste em cima.
 */
Hooks.on("preUpdateActor", (actor, changes, options, userId) => {
  if ( actor.type !== "pokemon" ) return;
  if ( options?.pkrpgSkipNatureHook ) return;
  if ( !foundry.utils.hasProperty(changes, "system.details.nature") ) return;

  const oldKey = actor.system.details?.nature ?? "";
  const newKey = foundry.utils.getProperty(changes, "system.details.nature") ?? "";
  if ( oldKey === newKey ) return;

  const oldNature = oldKey ? POKEMON_RPG.natures?.[oldKey] : null;
  const newNature = newKey ? POKEMON_RPG.natures?.[newKey] : null;

  // Atributos elegíveis (HP nunca é afetado por natureza).
  const attrs = ["atk", "def", "spa", "spd", "spe"];
  for ( const attr of attrs ) {
    let delta = 0;
    if ( oldNature?.up   === attr ) delta -= 2; // remove +2 antigo
    if ( oldNature?.down === attr ) delta += 2; // remove -2 antigo
    if ( newNature?.up   === attr ) delta += 2; // adiciona +2 novo
    if ( newNature?.down === attr ) delta -= 2; // adiciona -2 novo
    if ( delta === 0 ) continue;

    const path = `system.attributes.${attr}.value`;
    // Pega o valor pendente no update (se já estiver sendo alterado por outro
    // motivo) ou o valor atual do ator.
    const baseVal = foundry.utils.getProperty(changes, path)
                  ?? actor.system.attributes?.[attr]?.value
                  ?? 0;
    const newVal = Math.max(0, baseVal + delta);
    foundry.utils.setProperty(changes, path, newVal);
  }
});

/* -------------------------------------------- */
/*  Aprendizado automático de Golpes por Nível    */
/* -------------------------------------------- */

/**
 * Quando o nível de um Pokémon sobe, busca os golpes da learnset da espécie
 * que estão entre (nível_antigo, nível_novo] e os adiciona como items
 * embeddados, sem duplicar os que ele já conhece.
 *
 * Usa updateActor (pós-commit) pra que o nível já esteja persistido.
 *
 * Pode ser pulado passando `options.pkrpgSkipLearnMoves = true` no update.
 */
Hooks.on("updateActor", async (actor, changes, options, userId) => {
  if ( actor.type !== "pokemon" ) return;
  if ( options?.pkrpgSkipLearnMoves ) return;
  // Só roda para quem fez o update (evita executar 5x num cliente compartilhado).
  if ( game.user?.id !== userId ) return;
  if ( !foundry.utils.hasProperty(changes, "system.details.level") ) return;

  const newLevel = Number(foundry.utils.getProperty(changes, "system.details.level")) || 1;
  // O nível antigo: como já passou pelo update, actor.system.details.level já é o novo.
  // Calculamos o antigo a partir do diff (changes contém o NOVO valor).
  // Aqui usamos getFlag pra rastrear o último visto.
  const lastSeen = await actor.getFlag("pokemon-rpg", "lastLevelLearned") ?? 1;
  if ( newLevel <= lastSeen ) {
    // Salva o nível atual de qualquer forma pra evitar repetição
    if ( newLevel !== lastSeen ) await actor.setFlag("pokemon-rpg", "lastLevelLearned", newLevel);
    return;
  }
  try {
    const count = await learnMovesForLevelRange(actor, newLevel, lastSeen);
    await actor.setFlag("pokemon-rpg", "lastLevelLearned", newLevel);
    if ( count === 0 ) {
      console.log(`pokemon-rpg | ${actor.name} subiu pra nv ${newLevel} (nenhum golpe novo).`);
    }
  } catch (err) {
    console.error("pokemon-rpg | erro ao auto-aprender golpes:", err);
  }
});
newLevel);
    if ( count === 0 ) {
      console.log(`pokemon-rpg | ${actor.name} subiu pra nv ${newLevel} (nenhum golpe novo).`);
    }
  } catch (err) {
    console.error("pokemon-rpg | erro ao auto-aprender golpes:", err);
  }
});
}
});
