import { POKEMON_RPG } from "../helpers/config.mjs";
import { fieldHelpers } from "./shared.mjs";

const { SchemaField, NumberField, StringField, HTMLField, BooleanField, ArrayField } = fieldHelpers;

/* -------------------------------------------- */
/*  Move (Golpe)                                */
/* -------------------------------------------- */

export class MoveData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField({ required: true, initial: "" }),
      type: new StringField({
        required: true,
        initial: "normal",
        choices: () => Object.keys(POKEMON_RPG.types)
      }),
      category: new StringField({
        required: true,
        initial: "physical",
        choices: () => Object.keys(POKEMON_RPG.moveCategories)
      }),
      power: new NumberField({ required: true, nullable: true, integer: true, initial: null, min: 0 }),
      accuracy: new NumberField({ required: true, nullable: true, integer: true, initial: null, min: 0 }),
      pp: new SchemaField({
        value: new NumberField({ required: true, nullable: false, integer: true, initial: 10, min: 0 }),
        max:   new NumberField({ required: true, nullable: false, integer: true, initial: 10, min: 0 })
      }),
      // Dado de dano formula override - se vazio, calculado automaticamente via power.
      damageFormula: new StringField({ required: true, initial: "" }),
      effect: new HTMLField({ required: true, initial: "" }),
      // Nível em que é aprendido (0 = TM/Move learner, etc).
      learnLevel: new NumberField({ required: true, nullable: false, integer: true, initial: 1, min: 0 }),
      priority: new NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
      target: new StringField({ required: true, initial: "single" })
    };
  }
}

/* -------------------------------------------- */
/*  Talent (Talento do Treinador)               */
/* -------------------------------------------- */

export class TalentData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField({ required: true, initial: "" }),
      // Categoria do talento.
      //  - "general": qualquer um pode pegar a qualquer momento
      //  - "class":   ganho automaticamente por uma classe/subclasse
      category: new StringField({
        required: true,
        initial: "general",
        choices: () => Object.keys(POKEMON_RPG.talentCategories)
      }),
      // Slug da classe que concede este talento (quando category = "class").
      // Vazio para talentos gerais. Usado para agrupar talentos na ficha.
      sourceClass: new StringField({ required: true, initial: "" }),
      // Mantido por compatibilidade — restrição textual de classe (livre).
      classRestriction: new StringField({ required: true, initial: "" }),
      requiredLevel: new NumberField({ required: true, nullable: false, integer: true, initial: 1, min: 1 }),
      // Tipo do talento — passivo, ação, reação...
      activation: new StringField({
        required: true,
        initial: "passive",
        choices: ["passive", "action", "bonus", "reaction", "free"]
      }),
      // Requisitos de pré-requisito (texto livre por enquanto).
      prerequisites: new StringField({ required: true, initial: "" })
    };
  }
}

/* -------------------------------------------- */
/*  Class (Classe do Treinador)                 */
/* -------------------------------------------- */

export class ClassData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField({ required: true, initial: "" }),
      // Slug estável para referência cruzada (ex: "treinador", "elementalista").
      // Talentos referenciam classes via este slug em sourceClass.
      slug: new StringField({ required: true, initial: "" }),
      // Slug da classe-mãe; vazio = classe-mãe (top-level), preenchido = subclasse.
      parentClass: new StringField({ required: true, initial: "" }),
      // Atributo principal/saving throw favored.
      keyAttribute: new StringField({
        required: true,
        initial: "atk",
        choices: () => Object.keys(POKEMON_RPG.attributes)
      }),
      // HP base que essa classe concede no nível 1.
      hpBase: new NumberField({ required: true, nullable: false, integer: true, initial: 8, min: 1 }),
      // HP por nível adicional.
      hpPerLevel: new NumberField({ required: true, nullable: false, integer: true, initial: 5, min: 0 }),
      // Lista de slugs de talentos concedidos por esta classe (2 talentos automáticos).
      grantedTalents: new ArrayField(
        new StringField({ blank: false }),
        { initial: [] }
      ),
      // Perícias em que a classe é proficiente por padrão.
      grantedSkills: new ArrayField(
        new StringField({ blank: false }),
        { initial: [] }
      ),
      // Requisitos para pegar esta classe quando ela é da MESMA árvore que a do treinador
      // (i.e., subclasse da classe-mãe que o treinador já tem).
      requirementsSameTree: new StringField({ required: true, initial: "" }),
      // Requisitos para pegar esta classe vinda de OUTRA árvore (multiclasse).
      requirementsOther: new StringField({ required: true, initial: "" })
    };
  }
}

/* -------------------------------------------- */
/*  Ability (Habilidade do Pokémon)             */
/* -------------------------------------------- */

export class AbilityData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField({ required: true, initial: "" }),
      // Hidden ability ou normal.
      hidden: new BooleanField({ initial: false }),
      // Trigger - quando essa habilidade ativa.
      trigger: new StringField({ required: true, initial: "passive" })
    };
  }
}

/* -------------------------------------------- */
/*  Capacity (Capacidade do Pokémon)            */
/* -------------------------------------------- */

export class CapacityData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField({ required: true, initial: "" }),
      // Capacidades costumam ser numéricas (ex: Velocidade Terrestre 5, Velocidade de Voo 10).
      value: new NumberField({ required: true, nullable: true, integer: true, initial: null }),
      // Categoria: movement, sense, special.
      category: new StringField({
        required: true,
        initial: "movement",
        choices: ["movement", "sense", "special", "naturewalk"]
      })
    };
  }
}

/* -------------------------------------------- */
/*  Species (Espécie de Pokémon)                */
/* -------------------------------------------- */

export class SpeciesData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField({ required: true, initial: "" }),
      dexNumber: new NumberField({ required: true, nullable: true, integer: true, initial: null, min: 0 }),
      types: new SchemaField({
        primary: new StringField({
          required: true,
          initial: "normal",
          choices: () => Object.keys(POKEMON_RPG.types)
        }),
        secondary: new StringField({
          required: true,
          nullable: true,
          initial: null
        })
      }),
      // Stats base da espécie (estilo Pokédex).
      baseStats: new SchemaField({
        hp:  new NumberField({ required: true, nullable: false, integer: true, initial: 50, min: 1 }),
        atk: new NumberField({ required: true, nullable: false, integer: true, initial: 50, min: 1 }),
        def: new NumberField({ required: true, nullable: false, integer: true, initial: 50, min: 1 }),
        spa: new NumberField({ required: true, nullable: false, integer: true, initial: 50, min: 1 }),
        spd: new NumberField({ required: true, nullable: false, integer: true, initial: 50, min: 1 }),
        spe: new NumberField({ required: true, nullable: false, integer: true, initial: 50, min: 1 })
      }),
      // Lista de UUIDs (ou slugs) de moves aprendidos por nível.
      learnset: new ArrayField(
        new SchemaField({
          level: new NumberField({ required: true, integer: true, initial: 1, min: 0 }),
          moveSlug: new StringField({ required: true, blank: false })
        }),
        { initial: [] }
      ),
      // Habilidades possíveis dessa espécie.
      possibleAbilities: new ArrayField(
        new StringField({ blank: false }),
        { initial: [] }
      ),
      // Capacidades naturais dessa espécie.
      naturalCapacities: new ArrayField(
        new StringField({ blank: false }),
        { initial: [] }
      ),
      // Evolução
      evolutions: new ArrayField(
        new SchemaField({
          targetSlug: new StringField({ blank: false }),
          condition: new StringField({ initial: "level" }),
          value: new StringField({ initial: "" })
        }),
        { initial: [] }
      )
    };
  }
}
