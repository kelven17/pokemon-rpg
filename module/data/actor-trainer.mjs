import { POKEMON_RPG } from "../helpers/config.mjs";
import { makeAttributesField, makeHpField, makeBiographyField, fieldHelpers } from "./shared.mjs";

const { SchemaField, NumberField, StringField, BooleanField, ArrayField, ObjectField } = fieldHelpers;

/**
 * DataModel do Treinador.
 * Atributos seguem padrão D&D (mod = floor((value-10)/2)).
 * HP é derivado de mod de Saúde + nível + base da classe.
 * Perícias são padronizadas via POKEMON_RPG.skills.
 */
export class TrainerData extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    // Constrói o schema de perícias dinamicamente a partir do config.
    const skillEntries = {};
    for ( const key of Object.keys(POKEMON_RPG.skills) ) {
      skillEntries[key] = new SchemaField({
        value: new NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0 }),
        bonus: new NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        mod:   new NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        proficient: new BooleanField({ initial: false })
      });
    }

    return {
      attributes: makeAttributesField(),
      hp: makeHpField(),

      details: new SchemaField({
        level: new NumberField({ required: true, nullable: false, integer: true, initial: 1, min: 1, max: POKEMON_RPG.maxTrainerLevel }),
        xp: new SchemaField({
          value: new NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0 }),
          max:   new NumberField({ required: true, nullable: false, integer: true, initial: 100, min: 0 })
        }),
        age: new NumberField({ required: true, nullable: true, integer: true, initial: null }),
        hometown: new StringField({ required: true, initial: "" }),
        occupation: new StringField({ required: true, initial: "" }),
        money: new NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0 })
      }),

      skills: new SchemaField(skillEntries),

      // Bônus de proficiência (derivado do nível, mas armazenável para override).
      proficiency: new NumberField({ required: true, nullable: false, integer: true, initial: 2, min: 0 }),

      // Pontos de talento. `spent` cresce conforme o jogador gasta em classes/subclasses.
      // `max` e `available` são derivados em prepareDerivedData (não devem ser editados na ficha).
      talentPoints: new SchemaField({
        spent:     new NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0 }),
        max:       new NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0 }),
        available: new NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0 })
      }),

      // Lista de Pokémons na party - guardamos UUIDs para referência cruzada.
      // Cada entrada: { uuid: string, slot: number, active: boolean }
      party: new ArrayField(
        new SchemaField({
          uuid: new StringField({ required: true, blank: false }),
          slot: new NumberField({ required: true, integer: true, initial: 1, min: 1, max: 6 }),
          active: new BooleanField({ initial: false })
        }),
        { initial: [] }
      ),

      biography: makeBiographyField()
    };
  }

  /* -------------------------------------------- */
  /*  Derived Data                                */
  /* -------------------------------------------- */

  /**
   * Chamado automaticamente em prepareDerivedData() do Actor.
   * Calcula modificadores, HP máximo, bônus de proficiência e mod das perícias.
   */
  prepareDerivedData() {
    // 1. Modificador de cada atributo (estilo D&D).
    for ( const [key, attr] of Object.entries(this.attributes) ) {
      attr.mod = POKEMON_RPG.getModifier(attr.value);
    }

    // 2. Bônus de proficiência por nível.
    this.proficiency = POKEMON_RPG.proficiencyByLevel(this.details.level);

    // 3. HP máximo do treinador: Saúde (valor cheio, não modificador) * 4.
    const baseHp = (this.attributes.hp.value ?? 0) * 4;
    this.hp.max = Math.max(1, baseHp);

    // 3.5 Evasões derivadas — cada 10 pontos no atributo correspondente = +1 evasão.
    //  - Evasão Física    → Defesa
    //  - Evasão Especial  → Defesa Especial
    //  - Evasão Veloz     → Velocidade
    this.evasion = {
      physical: Math.floor((this.attributes.def?.value ?? 0) / 10),
      special:  Math.floor((this.attributes.spd?.value ?? 0) / 10),
      fast:     Math.floor((this.attributes.spe?.value ?? 0) / 10)
    };

    // 3.6 Pontos de talento — total derivado do nível, gastos persistidos.
    this.talentPoints.max = POKEMON_RPG.talentPointsByLevel(this.details.level);
    this.talentPoints.available = Math.max(0, this.talentPoints.max - (this.talentPoints.spent ?? 0));

    // 4. Modificador final de cada perícia.
    for ( const [key, skill] of Object.entries(this.skills) ) {
      const cfg = POKEMON_RPG.skills[key];
      const attrMod = this.attributes[cfg.attribute]?.mod ?? 0;
      const profBonus = skill.proficient ? this.proficiency : 0;
      skill.mod = attrMod + profBonus + skill.value + skill.bonus;
      skill.attribute = cfg.attribute;
      skill.label = cfg.label;
    }
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Retorna a lista de Pokémons da party como Actors carregados.
   * Async porque fromUuid pode buscar de outro mundo/compendium.
   */
  async getPartyActors() {
    const results = [];
    for ( const entry of this.party ) {
      try {
        const actor = await fromUuid(entry.uuid);
        if ( actor ) results.push({ ...entry, actor });
      } catch (err) {
        console.warn(`pokemon-rpg | Falha ao carregar Pokémon ${entry.uuid}:`, err);
      }
    }
    return results.sort((a, b) => a.slot - b.slot);
  }
}
