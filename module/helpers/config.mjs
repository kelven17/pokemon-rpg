/**
 * Configurações globais do sistema Pokémon RPG.
 * Tudo que é "tabela fixa" (perícias, tipos, atributos) vive aqui.
 */

export const POKEMON_RPG = {};

POKEMON_RPG.id = "pokemon-rpg";

/* -------------------------------------------- */
/*  Atributos                                   */
/* -------------------------------------------- */

POKEMON_RPG.attributes = {
  hp: "POKEMON_RPG.Attribute.HP",
  atk: "POKEMON_RPG.Attribute.Atk",
  def: "POKEMON_RPG.Attribute.Def",
  spa: "POKEMON_RPG.Attribute.SpA",
  spd: "POKEMON_RPG.Attribute.SpD",
  spe: "POKEMON_RPG.Attribute.Spe"
};

POKEMON_RPG.attributeAbbreviations = {
  hp:  "POKEMON_RPG.AttributeAbbr.HP",
  atk: "POKEMON_RPG.AttributeAbbr.Atk",
  def: "POKEMON_RPG.AttributeAbbr.Def",
  spa: "POKEMON_RPG.AttributeAbbr.SpA",
  spd: "POKEMON_RPG.AttributeAbbr.SpD",
  spe: "POKEMON_RPG.AttributeAbbr.Spe"
};

/* -------------------------------------------- */
/*  Perícias do Treinador                       */
/* -------------------------------------------- */

/**
 * Lista padronizada de perícias de Treinador.
 * `attribute` indica qual atributo é usado como modificador na rolagem.
 *
 * Estrutura final na ficha (por perícia):
 *  { value: 0, bonus: 0 } onde value = bônus de proficiência adicional
 */
POKEMON_RPG.skills = {
  // ATAQUE
  corrida:        { label: "POKEMON_RPG.Skill.Corrida",        attribute: "atk" },
  salto:          { label: "POKEMON_RPG.Skill.Salto",          attribute: "atk" },
  forca:          { label: "POKEMON_RPG.Skill.Forca",          attribute: "atk" },
  intimidacao:    { label: "POKEMON_RPG.Skill.Intimidacao",    attribute: "atk" },
  // SAÚDE
  resiliencia:    { label: "POKEMON_RPG.Skill.Resiliencia",    attribute: "hp"  },
  jejum:          { label: "POKEMON_RPG.Skill.Jejum",          attribute: "hp"  },
  apneia:         { label: "POKEMON_RPG.Skill.Apneia",         attribute: "hp"  },
  imunidade:      { label: "POKEMON_RPG.Skill.Imunidade",      attribute: "hp"  },
  // DEFESA
  incansavel:     { label: "POKEMON_RPG.Skill.Incansavel",     attribute: "def" },
  regeneracao:    { label: "POKEMON_RPG.Skill.Regeneracao",    attribute: "def" },
  deflexao:       { label: "POKEMON_RPG.Skill.Deflexao",       attribute: "def" },
  concentracao:   { label: "POKEMON_RPG.Skill.Concentracao",   attribute: "def" },
  // ATAQUE ESPECIAL
  historia:       { label: "POKEMON_RPG.Skill.Historia",       attribute: "spa" },
  programacao:    { label: "POKEMON_RPG.Skill.Programacao",    attribute: "spa" },
  investigacao:   { label: "POKEMON_RPG.Skill.Investigacao",   attribute: "spa" },
  engenharia:     { label: "POKEMON_RPG.Skill.Engenharia",     attribute: "spa" },
  // VELOCIDADE
  prestidigitacao:{ label: "POKEMON_RPG.Skill.Prestidigitacao",attribute: "spe" },
  acrobacia:      { label: "POKEMON_RPG.Skill.Acrobacia",      attribute: "spe" },
  performance:    { label: "POKEMON_RPG.Skill.Performance",    attribute: "spe" },
  furtividade:    { label: "POKEMON_RPG.Skill.Furtividade",    attribute: "spe" },
  // DEFESA ESPECIAL
  empatia:        { label: "POKEMON_RPG.Skill.Empatia",        attribute: "spd" },
  manipulacao:    { label: "POKEMON_RPG.Skill.Manipulacao",    attribute: "spd" },
  percepcao:      { label: "POKEMON_RPG.Skill.Percepcao",      attribute: "spd" },
  manha:          { label: "POKEMON_RPG.Skill.Manha",          attribute: "spd" }
};

/* -------------------------------------------- */
/*  Tipos Pokémon                               */
/* -------------------------------------------- */

POKEMON_RPG.types = {
  normal:   "POKEMON_RPG.Type.Normal",
  fire:     "POKEMON_RPG.Type.Fire",
  water:    "POKEMON_RPG.Type.Water",
  grass:    "POKEMON_RPG.Type.Grass",
  electric: "POKEMON_RPG.Type.Electric",
  ice:      "POKEMON_RPG.Type.Ice",
  fighting: "POKEMON_RPG.Type.Fighting",
  poison:   "POKEMON_RPG.Type.Poison",
  ground:   "POKEMON_RPG.Type.Ground",
  flying:   "POKEMON_RPG.Type.Flying",
  psychic:  "POKEMON_RPG.Type.Psychic",
  bug:      "POKEMON_RPG.Type.Bug",
  rock:     "POKEMON_RPG.Type.Rock",
  ghost:    "POKEMON_RPG.Type.Ghost",
  dragon:   "POKEMON_RPG.Type.Dragon",
  dark:     "POKEMON_RPG.Type.Dark",
  steel:    "POKEMON_RPG.Type.Steel",
  fairy:    "POKEMON_RPG.Type.Fairy"
};

/**
 * Tabela de eficácia de tipos (atacante -> defensor).
 * Multiplicadores: 0 = imune, 0.5 = pouco efetivo, 1 = normal, 2 = super efetivo.
 */
POKEMON_RPG.typeChart = {
  normal:   { rock: 0.5, ghost: 0, steel: 0.5 },
  fire:     { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water:    { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  grass:    { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  electric: { water: 2, grass: 0.5, electric: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  ice:      { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
  poison:   { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground:   { fire: 2, grass: 0.5, electric: 2, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying:   { grass: 2, electric: 0.5, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic:  { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug:      { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
  rock:     { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost:    { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon:   { dragon: 2, steel: 0.5, fairy: 0 },
  dark:     { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel:    { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy:    { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 }
};

/* -------------------------------------------- */
/*  Categorias de Golpe                         */
/* -------------------------------------------- */

POKEMON_RPG.moveCategories = {
  physical: "POKEMON_RPG.MoveCategory.Physical",
  special:  "POKEMON_RPG.MoveCategory.Special",
  status:   "POKEMON_RPG.MoveCategory.Status"
};

/* -------------------------------------------- */
/*  Aptidões (Concursos)                         */
/* -------------------------------------------- */

POKEMON_RPG.aptitudes = {
  beleza:      "POKEMON_RPG.Aptidao.Beleza",
  estilo:      "POKEMON_RPG.Aptidao.Estilo",
  perspicacia: "POKEMON_RPG.Aptidao.Perspicacia",
  ternura:     "POKEMON_RPG.Aptidao.Ternura",
  vigor:       "POKEMON_RPG.Aptidao.Vigor"
};

/* -------------------------------------------- */
/*  Alcance dos Golpes                           */
/* -------------------------------------------- */

POKEMON_RPG.ranges = {
  si:     "POKEMON_RPG.Alcance.Si",
  melee:  "POKEMON_RPG.Alcance.Melee",
  ranged: "POKEMON_RPG.Alcance.Ranged",
  area:   "POKEMON_RPG.Alcance.Area"
};

/* -------------------------------------------- */
/*  Frequência dos Golpes                        */
/* -------------------------------------------- */

POKEMON_RPG.frequencies = {
  "at-will":          "POKEMON_RPG.Frequencia.AtWill",
  "every-other":      "POKEMON_RPG.Frequencia.EveryOther",
  "per-encounter":    "POKEMON_RPG.Frequencia.PerEncounter",
  "daily":            "POKEMON_RPG.Frequencia.Daily"
};

/* -------------------------------------------- */
/*  Tipos de Gatilho de Habilidades              */
/* -------------------------------------------- */

POKEMON_RPG.abilityTriggers = {
  "constante":         "POKEMON_RPG.AbilityTrigger.Constante",
  "ativacao-at-will":  "POKEMON_RPG.AbilityTrigger.AtivacaoAtWill",
  "ativacao-horaria":  "POKEMON_RPG.AbilityTrigger.AtivacaoHoraria",
  "ativacao-diaria":   "POKEMON_RPG.AbilityTrigger.AtivacaoDiaria",
  "gatilho-constante": "POKEMON_RPG.AbilityTrigger.GatilhoConstante",
  "gatilho-at-will":   "POKEMON_RPG.AbilityTrigger.GatilhoAtWill",
  "gatilho-horaria":   "POKEMON_RPG.AbilityTrigger.GatilhoHoraria",
  "gatilho-diaria":    "POKEMON_RPG.AbilityTrigger.GatilhoDiaria"
};

/* -------------------------------------------- */
/*  Categorias de Capacidades                    */
/* -------------------------------------------- */

POKEMON_RPG.capacityCategories = {
  "numeric":    "POKEMON_RPG.CapacityCategory.Numeric",
  "movement":   "POKEMON_RPG.CapacityCategory.Movement",
  "special":    "POKEMON_RPG.CapacityCategory.Special",
  "sense":      "POKEMON_RPG.CapacityCategory.Sense",
  "naturewalk": "POKEMON_RPG.CapacityCategory.Naturewalk"
};

/* -------------------------------------------- */
/*  Descritores de Concursos                     */
/* -------------------------------------------- */

POKEMON_RPG.contestDescriptors = {
  abertura:        "POKEMON_RPG.Concursos.Abertura",
  abstracao:       "POKEMON_RPG.Concursos.Abstracao",
  amizade:         "POKEMON_RPG.Concursos.Amizade",
  climax:          "POKEMON_RPG.Concursos.Climax",
  cobica:          "POKEMON_RPG.Concursos.Cobica",
  conquista:       "POKEMON_RPG.Concursos.Conquista",
  constrangimento: "POKEMON_RPG.Concursos.Constrangimento",
  continuacao:     "POKEMON_RPG.Concursos.Continuacao",
  dedicatoria:     "POKEMON_RPG.Concursos.Dedicatoria",
  desfecho:        "POKEMON_RPG.Concursos.Desfecho",
  despedida:       "POKEMON_RPG.Concursos.Despedida",
  encerramento:    "POKEMON_RPG.Concursos.Encerramento",
  entrada:         "POKEMON_RPG.Concursos.Entrada",
  especial:        "POKEMON_RPG.Concursos.Especial",
  excentricidade:  "POKEMON_RPG.Concursos.Excentricidade",
  extravagancia:   "POKEMON_RPG.Concursos.Extravagancia",
  incentivo:       "POKEMON_RPG.Concursos.Incentivo",
  modelo:          "POKEMON_RPG.Concursos.Modelo",
  modestia:        "POKEMON_RPG.Concursos.Modestia",
  pausa:           "POKEMON_RPG.Concursos.Pausa",
  perspectiva:     "POKEMON_RPG.Concursos.Perspectiva",
  proveito:        "POKEMON_RPG.Concursos.Proveito",
  reviravolta:     "POKEMON_RPG.Concursos.Reviravolta",
  seguranca:       "POKEMON_RPG.Concursos.Seguranca",
  sorteio:         "POKEMON_RPG.Concursos.Sorteio",
  surpresa:        "POKEMON_RPG.Concursos.Surpresa"
};

/**
 * Mapeamento dos Descritores de Concursos para as 5 Aptidões.
 * Pelo livro:
 *   - Beleza:       Modelo, Modéstia, Despedida, Pausa
 *   - Estilo:       Conquista, Encerramento, Excentricidade, Reviravolta, Sorteio
 *   - Perspicácia:  Abertura, Abstração, Continuação, Desfecho, Perspectiva
 *   - Ternura:      Amizade, Cobiça, Constrangimento, Dedicatória, Especial, Proveito, Surpresa
 *   - Vigor:        Clímax, Entrada, Extravagância, Incentivo, Segurança
 */
POKEMON_RPG.contestToAptitude = {
  modelo: "beleza", modestia: "beleza", despedida: "beleza", pausa: "beleza",
  conquista: "estilo", encerramento: "estilo", excentricidade: "estilo",
    reviravolta: "estilo", sorteio: "estilo",
  abertura: "perspicacia", abstracao: "perspicacia", continuacao: "perspicacia",
    desfecho: "perspicacia", perspectiva: "perspicacia",
  amizade: "ternura", cobica: "ternura", constrangimento: "ternura",
    dedicatoria: "ternura", especial: "ternura", proveito: "ternura", surpresa: "ternura",
  climax: "vigor", entrada: "vigor", extravagancia: "vigor",
    incentivo: "vigor", seguranca: "vigor"
};

/* -------------------------------------------- */
/*  Bônus de Proficiência por Nível             */
/* -------------------------------------------- */

/**
 * Tabela estilo D&D 5e.
 */
POKEMON_RPG.proficiencyByLevel = (level) => {
  if ( level >= 17 ) return 6;
  if ( level >= 13 ) return 5;
  if ( level >= 9  ) return 4;
  if ( level >= 5  ) return 3;
  return 2;
};

/* -------------------------------------------- */
/*  Cálculo de Modificador (estilo D&D)         */
/* -------------------------------------------- */

POKEMON_RPG.getModifier = (attributeValue) => {
  return Math.floor((attributeValue - 10) / 2);
};

/* -------------------------------------------- */
/*  Sistema de Classes / Subclasses             */
/* -------------------------------------------- */

/**
 * Nível máximo do treinador.
 */
POKEMON_RPG.maxTrainerLevel = 50;

/**
 * Hierarquia de classes/subclasses do sistema.
 * Cada chave é o slug da classe-mãe; subclasses listadas em `subclasses`.
 *
 * Regras:
 *  - A primeira classe é ganha no nível 1 sem custo.
 *  - Pegar uma SUBCLASSE da própria árvore custa 2 pontos de talento.
 *  - Pegar uma classe/subclasse de OUTRA árvore custa 2 pontos de talento.
 *  - Cada classe/subclasse concede 2 talentos automaticamente.
 *  - Cada classe pode definir requisitos diferentes para os dois casos.
 */
POKEMON_RPG.classHierarchy = {
  treinador:    { label: "POKEMON_RPG.Class.Treinador",    subclasses: ["elementalista", "especialista"] },
  captor:       { label: "POKEMON_RPG.Class.Captor",       subclasses: ["engenheiro", "ladrao", "artifice"] },
  criador:      { label: "POKEMON_RPG.Class.Criador",      subclasses: ["medico", "evolucionista", "tutor"] },
  artista:      { label: "POKEMON_RPG.Class.Artista",      subclasses: ["cuidador", "observador"] },
  pesquisador:  { label: "POKEMON_RPG.Class.Pesquisador",  subclasses: ["fotografo", "hipnologo"] },
  ranger:       { label: "POKEMON_RPG.Class.Ranger",       subclasses: ["guia"] },
  guerreiro:    { label: "POKEMON_RPG.Class.Guerreiro",    subclasses: ["monge", "ninja", "soldado"] },
  empatico:     { label: "POKEMON_RPG.Class.Empatico",     subclasses: ["vidente"] },
  psiquico:     { label: "POKEMON_RPG.Class.Psiquico",     subclasses: ["dobrador-elemental"] },
  mistico:      { label: "POKEMON_RPG.Class.Mistico",      subclasses: ["medium", "ilusionista", "runico", "xama"] }
};

/**
 * Labels das subclasses (slug -> i18n key).
 * Usadas pelos selects de "parentClass" / referência.
 */
POKEMON_RPG.subclassLabels = {
  // Treinador
  elementalista:        "POKEMON_RPG.Class.Elementalista",
  especialista:         "POKEMON_RPG.Class.Especialista",
  // Captor
  engenheiro:           "POKEMON_RPG.Class.Engenheiro",
  ladrao:               "POKEMON_RPG.Class.Ladrao",
  artifice:             "POKEMON_RPG.Class.Artifice",
  // Criador
  medico:               "POKEMON_RPG.Class.Medico",
  evolucionista:        "POKEMON_RPG.Class.Evolucionista",
  tutor:                "POKEMON_RPG.Class.Tutor",
  // Artista
  cuidador:             "POKEMON_RPG.Class.Cuidador",
  observador:           "POKEMON_RPG.Class.Observador",
  // Pesquisador
  fotografo:            "POKEMON_RPG.Class.Fotografo",
  hipnologo:            "POKEMON_RPG.Class.Hipnologo",
  // Ranger
  guia:                 "POKEMON_RPG.Class.Guia",
  // Guerreiro
  monge:                "POKEMON_RPG.Class.Monge",
  ninja:                "POKEMON_RPG.Class.Ninja",
  soldado:              "POKEMON_RPG.Class.Soldado",
  // Empático
  vidente:              "POKEMON_RPG.Class.Vidente",
  // Psíquico
  "dobrador-elemental": "POKEMON_RPG.Class.DobradorElemental",
  // Místico
  medium:               "POKEMON_RPG.Class.Medium",
  ilusionista:          "POKEMON_RPG.Class.Ilusionista",
  runico:               "POKEMON_RPG.Class.Runico",
  xama:                 "POKEMON_RPG.Class.Xama"
};

/**
 * Retorna o slug da classe-mãe a partir do slug de uma subclasse.
 * Retorna null se a chave for ela própria uma classe-mãe (ou não existir).
 */
POKEMON_RPG.getParentClass = (slug) => {
  if ( !slug ) return null;
  if ( POKEMON_RPG.classHierarchy[slug] ) return null; // já é classe-mãe
  for ( const [parent, def] of Object.entries(POKEMON_RPG.classHierarchy) ) {
    if ( def.subclasses?.includes(slug) ) return parent;
  }
  return null;
};

/**
 * Retorna todos os slugs disponíveis (classes-mãe + subclasses), com label.
 * Útil para popular selects.
 */
POKEMON_RPG.allClassSlugs = () => {
  const out = {};
  for ( const [slug, def] of Object.entries(POKEMON_RPG.classHierarchy) ) {
    out[slug] = def.label;
    for ( const sub of def.subclasses ?? [] ) {
      out[sub] = POKEMON_RPG.subclassLabels[sub] ?? sub;
    }
  }
  return out;
};

/* -------------------------------------------- */
/*  Pontos de Talento                            */
/* -------------------------------------------- */

/**
 * Total de pontos de talento ganhos até o nível indicado.
 *
 * REGRA OFICIAL (a aplicar no futuro):
 *   - 2 pontos no nível 5
 *   - 2 pontos no nível 12
 *   - 2 pontos no nível 24
 *   (Total: 6 pontos no nível 24+.)
 *
 * REGRA TEMPORÁRIA (atual): +1 ponto a cada nível ganho.
 */
POKEMON_RPG.talentPointsByLevel = (level) => {
  const lvl = Math.max(1, Number(level) || 1);
  // Temporário: 1 ponto por nível ganho (a partir do nível 1).
  return Math.max(0, lvl - 1);

  // Quando quiser ativar a regra oficial, troque pelo bloco abaixo:
  // let pts = 0;
  // if ( lvl >= 5 )  pts += 2;
  // if ( lvl >= 12 ) pts += 2;
  // if ( lvl >= 24 ) pts += 2;
  // return pts;
};

/**
 * Categoria de talento.
 *  - general: qualquer um pode pegar a qualquer momento.
 *  - class:   concedido por uma classe ou subclasse específica.
 */
POKEMON_RPG.talentCategories = {
  general: "POKEMON_RPG.TalentCategory.General",
  class:   "POKEMON_RPG.TalentCategory.Class"
};

/* -------------------------------------------- */
/*  Naturezas do Pokémon                         */
/* -------------------------------------------- */

/**
 * As 25 naturezas tradicionais. Cada uma soma +1 no modificador do atributo `up`
 * e subtrai 1 do atributo `down`. As 5 naturezas neutras (Hardy, Docile, Serious,
 * Bashful, Quirky) não têm `up`/`down` — são puramente cosméticas.
 *
 * O modificador é aplicado em prepareDerivedData do PokemonData.
 */
POKEMON_RPG.natures = {
  hardy:   { label: "POKEMON_RPG.Nature.Hardy",   up: null,  down: null  },
  lonely:  { label: "POKEMON_RPG.Nature.Lonely",  up: "atk", down: "def" },
  brave:   { label: "POKEMON_RPG.Nature.Brave",   up: "atk", down: "spe" },
  adamant: { label: "POKEMON_RPG.Nature.Adamant", up: "atk", down: "spa" },
  naughty: { label: "POKEMON_RPG.Nature.Naughty", up: "atk", down: "spd" },
  bold:    { label: "POKEMON_RPG.Nature.Bold",    up: "def", down: "atk" },
  docile:  { label: "POKEMON_RPG.Nature.Docile",  up: null,  down: null  },
  relaxed: { label: "POKEMON_RPG.Nature.Relaxed", up: "def", down: "spe" },
  impish:  { label: "POKEMON_RPG.Nature.Impish",  up: "def", down: "spa" },
  lax:     { label: "POKEMON_RPG.Nature.Lax",     up: "def", down: "spd" },
  timid:   { label: "POKEMON_RPG.Nature.Timid",   up: "spe", down: "atk" },
  hasty:   { label: "POKEMON_RPG.Nature.Hasty",   up: "spe", down: "def" },
  serious: { label: "POKEMON_RPG.Nature.Serious", up: null,  down: null  },
  jolly:   { label: "POKEMON_RPG.Nature.Jolly",   up: "spe", down: "spa" },
  naive:   { label: "POKEMON_RPG.Nature.Naive",   up: "spe", down: "spd" },
  modest:  { label: "POKEMON_RPG.Nature.Modest",  up: "spa", down: "atk" },
  mild:    { label: "POKEMON_RPG.Nature.Mild",    up: "spa", down: "def" },
  quiet:   { label: "POKEMON_RPG.Nature.Quiet",   up: "spa", down: "spe" },
  bashful: { label: "POKEMON_RPG.Nature.Bashful", up: null,  down: null  },
  rash:    { label: "POKEMON_RPG.Nature.Rash",    up: "spa", down: "spd" },
  calm:    { label: "POKEMON_RPG.Nature.Calm",    up: "spd", down: "atk" },
  gentle:  { label: "POKEMON_RPG.Nature.Gentle",  up: "spd", down: "def" },
  sassy:   { label: "POKEMON_RPG.Nature.Sassy",   up: "spd", down: "spe" },
  careful: { label: "POKEMON_RPG.Nature.Careful", up: "spd", down: "spa" },
  quirky:  { label: "POKEMON_RPG.Nature.Quirky",  up: null,  down: null  }
};

/**
 * Retorna o slug de uma natureza aleatória entre as 25 disponíveis.
 */
POKEMON_RPG.randomNature = () => {
  const keys = Object.keys(POKEMON_RPG.natures);
  return keys[Math.floor(Math.random() * keys.length)];
};
