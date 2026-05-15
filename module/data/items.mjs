import { POKEMON_RPG } from "../helpers/config.mjs";
import { fieldHelpers } from "./shared.mjs";

const { SchemaField, NumberField, StringField, HTMLField, BooleanField, ArrayField } = fieldHelpers;

/* -------------------------------------------- */
/*  Move (Golpe) — molde do Livro do Jogador     */
/* -------------------------------------------- */

export class MoveData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField({ required: true, initial: "" }),
      // Tipo elemental (fogo, água, planta, etc.)
      type: new StringField({
        required: true,
        initial: "normal",
        choices: () => Object.keys(POKEMON_RPG.types)
      }),
      // Categoria mecânica do dano: físico (Atk), especial (SpA) ou status.
      category: new StringField({
        required: true,
        initial: "physical",
        choices: () => Object.keys(POKEMON_RPG.moveCategories)
      }),
      // Aptidão para concursos: beleza, estilo, perspicacia, ternura, vigor.
      // (Definida automaticamente via Concursos.descriptor → aptitude.)
      aptidao: new StringField({
        required: true,
        initial: "vigor",
        choices: () => Object.keys(POKEMON_RPG.aptitudes ?? {})
      }),
      // Lista de descritores estruturais do golpe (Ameaça, Barreira, Coluna, Empurrão,
      // Explosão, Saraivada, Som, Impacto, Investida, Interceptação, Interrupção,
      // Preparo, Prisão, Rebote, Exaustão, Cobertura, Clima, Moral, Dança).
      // Cada entrada é uma string com o descritor e seus argumentos opcionais
      // (ex.: "Empurrão 5 (1d12)", "Explosão 3", "Saraivada 5").
      descritores: new ArrayField(new StringField({ blank: false }), { initial: [] }),
      // Dificuldade de Acurácia. Se null, é Acurácia Automática (não rola d20).
      // Substitui o antigo `accuracy` (mantemos o mesmo campo por compat.)
      accuracy: new NumberField({ required: true, nullable: true, integer: true, initial: null, min: 0 }),
      // Dano Basal — fórmula como string (ex.: "5d12+18", "1d6+3"). Vazio = sem dano basal.
      // Suporta também "Ver Efeito" para danos descritos no efeito.
      damageBasal: new StringField({ required: true, initial: "" }),
      // Alcance: si | melee | ranged | area
      alcance: new StringField({
        required: true,
        initial: "melee",
        choices: () => Object.keys(POKEMON_RPG.ranges ?? {})
      }),
      // Distância em metros, quando alcance = "ranged" (À Distância).
      alcanceRange: new NumberField({ required: true, nullable: true, integer: true, initial: null, min: 0 }),
      // Frequência: at-will, every-other-round, per-encounter, daily.
      // Determina quando o golpe pode ser usado de novo.
      frequencia: new StringField({
        required: true,
        initial: "per-encounter",
        choices: () => Object.keys(POKEMON_RPG.frequencies ?? {})
      }),
      // Estado de uso da frequência (controlado pela rolagem).
      usado: new BooleanField({ required: true, initial: false }),
      // Descritor de Concursos (Abertura, Clímax, Conquista, etc.) — referência
      // ao desempenho em Concursos. Apenas string-slug por enquanto.
      contestDescriptor: new StringField({ required: true, initial: "" }),
      // Override de Pontuação Basal de Concursos (string como "1d4" ou "0").
      contestOverride: new StringField({ required: true, initial: "" }),
      // PP / Pontos de Poder — mantido por compat. com fichas antigas, mas
      // o sistema oficial usa Frequência. PP=0 desativa rastreamento de PP.
      pp: new SchemaField({
        value: new NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0 }),
        max:   new NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0 })
      }),
      // Texto livre do efeito do golpe.
      effect: new HTMLField({ required: true, initial: "" }),
      // Nível em que é aprendido (0 = TM/Move learner, etc).
      learnLevel: new NumberField({ required: true, nullable: false, integer: true, initial: 1, min: 0 }),
      priority: new NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
      target: new StringField({ required: true, initial: "single" }),
      // Capacidade ou Deslocamento concedido pelo golpe (ex.: "Combustão", "Eletricidade").
      grantedCapacity: new StringField({ required: true, initial: "" })
    };
  }
}

/* -------------------------------------------- */
/*  Talent (Talento do Treinador)               */
/* -------------------------------------------- */

export class TalentData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField({ required: false, blank: true, initial: "" }),
      // Categoria do talento (estrutura do Excel):
      //  - "general":         Talento Geral (qualquer um pode pegar)
      //  - "class":           Talento de Classe específica (opcional, gasta ponto)
      //  - "characteristic":  Característica de Classe (auto-concedida pela classe)
      // Não usamos `choices` pra evitar validation hard-fail em dados legados.
      category:      new StringField({ required: false, blank: true, initial: "general" }),
      sourceClass:   new StringField({ required: false, blank: true, initial: "" }),
      // Campos estruturados do Excel:
      requisitos:    new StringField({ required: false, blank: true, initial: "" }),
      frequencia:    new StringField({ required: false, blank: true, initial: "" }),
      alvo:          new StringField({ required: false, blank: true, initial: "" }),
      gatilho:       new StringField({ required: false, blank: true, initial: "" }),
      contragatilho: new StringField({ required: false, blank: true, initial: "" }),
      efeito:        new HTMLField({ required: false, blank: true, initial: "" }),
      // Legacy fields — mantidos por compat.
      classRestriction: new StringField({ required: false, blank: true, initial: "" }),
      requiredLevel: new NumberField({ required: false, nullable: true, integer: true, initial: 1, min: 0 }),
      activation:    new StringField({ required: false, blank: true, initial: "passive" }),
      prerequisites: new StringField({ required: false, blank: true, initial: "" })
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
      // Descrição livre (mantida por compat. com fichas antigas).
      description: new HTMLField({ required: true, initial: "" }),
      // Hidden ability ou normal.
      hidden: new BooleanField({ initial: false }),
      // Categoria do gatilho — molde do livro:
      //   constante         → "Constante"
      //   ativacao-at-will  → "Ativação À Vontade"
      //   ativacao-horaria  → "Ativação Horária"
      //   ativacao-diaria   → "Ativação Diária"
      //   gatilho-constante → "Gatilho Constante: <condição>"
      //   gatilho-at-will   → "Gatilho À Vontade: <condição>"
      //   gatilho-horaria   → "Gatilho Horário: <condição>"
      //   gatilho-diaria    → "Gatilho Diário: <condição>"
      triggerKey: new StringField({
        required: true,
        initial: "constante",
        choices: () => Object.keys(POKEMON_RPG.abilityTriggers ?? {})
      }),
      // Para habilidades do tipo "Gatilho X: ...", o texto da condição.
      condicao: new StringField({ required: true, initial: "" }),
      // Texto principal do Efeito (sem o prefixo "Efeito:").
      effect: new HTMLField({ required: true, initial: "" }),
      // Flag de estado: ativada/usada (para Ativação Diária / Horária).
      usado: new BooleanField({ required: true, initial: false }),
      // Mantido por compat. legacy.
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
      // Descrição completa (texto do Livro dos Pokémons).
      description: new HTMLField({ required: true, initial: "" }),
      // Valor numérico (ex.: Força 5, Terrestre 7). null para capacidades especiais
      // que são apenas "tem ou não tem".
      value: new NumberField({ required: true, nullable: true, integer: true, initial: null }),
      // Categoria:
      //   - numeric:   Força, Inteligência, Salto (valor 1-10)
      //   - movement:  Deslocamentos (Terrestre, Voo, Natação, Escavação, Subaquático)
      //   - special:   Capacidades especiais (Aura, Combustão, Faro, etc.)
      //   - sense:     Sentidos (legado, mantido por compat)
      //   - naturewalk: legado
      category: new StringField({
        required: true,
        initial: "special",
        choices: ["numeric", "movement", "special", "sense", "naturewalk"]
      }),
      // Limite máximo do valor (apenas para `numeric` ou `movement`).
      // Ex.: Força vai de 1 a 10; Terrestre não tem limite formal.
      maxValue: new NumberField({ required: true, nullable: true, integer: true, initial: null }),
      // Efeito mecânico curto (para uso em rolagens, se aplicável).
      effect: new HTMLField({ required: true, initial: "" })
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
      // Atributos Basais (Saúde, Ataque, Defesa, etc.) — valores 1-15 do livro.
      baseStats: new SchemaField({
        hp:  new NumberField({ required: true, nullable: false, integer: true, initial: 5, min: 0 }),
        atk: new NumberField({ required: true, nullable: false, integer: true, initial: 5, min: 0 }),
        def: new NumberField({ required: true, nullable: false, integer: true, initial: 5, min: 0 }),
        spa: new NumberField({ required: true, nullable: false, integer: true, initial: 5, min: 0 }),
        spd: new NumberField({ required: true, nullable: false, integer: true, initial: 5, min: 0 }),
        spe: new NumberField({ required: true, nullable: false, integer: true, initial: 5, min: 0 })
      }),
      // Capacidades numéricas da espécie + outras nomeadas.
      capacidades: new SchemaField({
        forca:         new NumberField({ required: true, nullable: true, integer: true, initial: null, min: 0 }),
        inteligencia:  new NumberField({ required: true, nullable: true, integer: true, initial: null, min: 0 }),
        salto:         new NumberField({ required: true, nullable: true, integer: true, initial: null, min: 0 }),
        outras:        new ArrayField(new StringField({ blank: false }), { initial: [] })
      }),
      // Deslocamentos da espécie (Terrestre, Voo, etc.) com valor em metros/rodada.
      deslocamentos: new SchemaField({
        terrestre:    new NumberField({ required: true, nullable: true, integer: true, initial: null, min: 0 }),
        natacao:      new NumberField({ required: true, nullable: true, integer: true, initial: null, min: 0 }),
        voo:          new NumberField({ required: true, nullable: true, integer: true, initial: null, min: 0 }),
        escavacao:    new NumberField({ required: true, nullable: true, integer: true, initial: null, min: 0 }),
        subaquatico:  new NumberField({ required: true, nullable: true, integer: true, initial: null, min: 0 })
      }),
      // Habilidades comuns possíveis (nomes de Habilidades existentes no compendium).
      habilidades: new ArrayField(new StringField({ blank: false }), { initial: [] }),
      // Altas Habilidades (hidden abilities — desbloqueáveis no nível 40).
      altasHabilidades: new ArrayField(new StringField({ blank: false }), { initial: [] }),
      // Golpes Naturais — ordem por nível em que são aprendidos.
      learnset: new ArrayField(
        new SchemaField({
          level:   new NumberField({ required: true, integer: true, initial: 1, min: 0 }),
          trigger: new StringField({ required: true, initial: "level" }), // "level" ou "evolution"
          move:    new StringField({ required: true, blank: false })
        }),
        { initial: [] }
      ),
      // Golpes Herdados (procriação): nomes de golpes que podem ser aprendidos via herança.
      golpesHerdados: new ArrayField(new StringField({ blank: false }), { initial: [] }),
      // Golpes Ensináveis (TM/Tutor): nomes de golpes ensináveis por Tutor.
      golpesEnsinaveis: new ArrayField(new StringField({ blank: false }), { initial: [] }),
      // Evoluções — rules estruturadas.
      evolucoes: new ArrayField(
        new SchemaField({
          from:      new StringField({ blank: false }),    // nome da espécie de origem
          to:        new StringField({ blank: false }),    // nome da espécie destino
          condition: new StringField({ initial: "level" }),// level | item | trade | friendship | etc.
          value:     new NumberField({ required: true, nullable: true, integer: true, initial: null })
        }),
        { initial: [] }
      ),
      // Tamanho da espécie.
      tamanho: new SchemaField({
        categoria: new StringField({ required: true, initial: "" }),
        metros:    new NumberField({ required: true, nullable: true, initial: null })
      }),
      // Categoria de peso (Muito Leve, Leve, Médio, Pesado, Muito Pesado, Extremamente Pesado).
      categoriaPeso:  new StringField({ required: true, initial: "" }),
      // Chance de Captura (1-255) e Experiência por derrota — uso do Narrador.
      chanceCaptura:  new NumberField({ required: true, nullable: true, integer: true, initial: null }),
      experiencia:    new NumberField({ required: true, nullable: true, integer: true, initial: null })
    };
  }
}
