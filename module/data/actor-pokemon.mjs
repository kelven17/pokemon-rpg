import { POKEMON_RPG } from "../helpers/config.mjs";
import { makeAttributesField, makeHpField, makeBiographyField, fieldHelpers } from "./shared.mjs";

const { SchemaField, NumberField, StringField, BooleanField, ArrayField } = fieldHelpers;

/**
 * DataModel do Pokémon.
 * Atributos são valores DIRETOS (estilo jogos: 1-255).
 * Tipo principal e secundário definidos pela espécie.
 * HP máx = atributo HP + nível (fórmula simplificada — pode ajustar).
 */
export class PokemonData extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    return {
      attributes: makeAttributesField(),
      hp: makeHpField(),

      species: new SchemaField({
        name: new StringField({ required: true, initial: "" }),
        // Referência opcional para um Item de espécie no compendium.
        uuid: new StringField({ required: true, initial: "" }),
        dexNumber: new NumberField({ required: true, nullable: true, integer: true, initial: null, min: 0 })
      }),

      types: new SchemaField({
        primary: new StringField({
          required: true,
          initial: "normal",
          choices: () => Object.keys(POKEMON_RPG.types)
        }),
        secondary: new StringField({
          required: true,
          nullable: true,
          initial: null,
          // null permitido — pokémon mono-tipo
          choices: () => [null, ...Object.keys(POKEMON_RPG.types)]
        })
      }),

      details: new SchemaField({
        level: new NumberField({ required: true, nullable: false, integer: true, initial: 1, min: 1, max: 100 }),
        xp: new SchemaField({
          value: new NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0 }),
          max:   new NumberField({ required: true, nullable: false, integer: true, initial: 100, min: 0 })
        }),
        nature: new StringField({ required: true, initial: "" }),
        gender: new StringField({ required: true, initial: "" }),
        // UUID do treinador dono. Vazio = sem dono associado.
        trainer: new StringField({ required: true, initial: "" }),
        // Estado de captura — define o multiplicador de HP (capturado x4, selvagem x3)
        // e pode ser ajustado manualmente na ficha. É sincronizado automaticamente
        // quando o Pokémon entra/sai de uma party de treinador.
        captured: new BooleanField({ required: true, initial: false }),
        nickname: new StringField({ required: true, initial: "" }),
        // Status condition (poison, burn, paralysis, sleep, freeze...)
        status: new StringField({ required: true, initial: "" })
      }),

      // Pokémon tem habilidade(s) - a maioria 1, alguns 2.
      // O slot da ability ativa.
      activeAbility: new StringField({ required: true, initial: "" }),

      biography: makeBiographyField()
    };
  }

  /* -------------------------------------------- */
  /*  Derived Data                                */
  /* -------------------------------------------- */

  prepareDerivedData() {
    // Para Pokémon, "mod" é o próprio valor (stats diretos).
    // O valor já vem com o modificador da natureza aplicado pelo hook
    // preUpdateActor (pokemon.mjs), então mod é só um espelho de value.
    for ( const [key, attr] of Object.entries(this.attributes) ) {
      attr.mod = attr.value;
    }

    // HP máx do Pokémon:
    //  - Capturado:  Saúde * 4
    //  - Selvagem:   Saúde * 3
    // Considera capturado se a flag `details.captured` estiver marcada
    // OU se houver um treinador associado (compat. com pokémons antigos).
    const isCaptured = !!this.details.captured
      || !!(this.details.trainer && this.details.trainer.length > 0);
    const multiplier = isCaptured ? 4 : 3;
    const computedMax = (this.attributes.hp.value ?? 0) * multiplier;
    this.hp.max = Math.max(1, computedMax);

    // Evasões derivadas — cada 10 pontos no atributo correspondente = +1 evasão.
    //  - Evasão Física    → Defesa
    //  - Evasão Especial  → Defesa Especial
    //  - Evasão Veloz     → Velocidade
    this.evasion = {
      physical: Math.floor((this.attributes.def?.value ?? 0) / 10),
      special:  Math.floor((this.attributes.spd?.value ?? 0) / 10),
      fast:     Math.floor((this.attributes.spe?.value ?? 0) / 10)
    };
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Retorna o Actor do treinador dono, se houver.
   */
  async getTrainer() {
    if ( !this.details.trainer ) return null;
    try {
      return await fromUuid(this.details.trainer);
    } catch (err) {
      console.warn(`pokemon-rpg | Falha ao carregar treinador:`, err);
      return null;
    }
  }

  /**
   * Retorna o multiplicador de eficácia ao receber um ataque do tipo `attackType`.
   * Considera dual-type combinando os multiplicadores.
   */
  getTypeEffectiveness(attackType) {
    const chart = POKEMON_RPG.typeChart[attackType] ?? {};
    const m1 = chart[this.types.primary] ?? 1;
    const m2 = this.types.secondary ? (chart[this.types.secondary] ?? 1) : 1;
    return m1 * m2;
  }
}
