# Pokémon RPG — Sistema para Foundry VTT

Sistema híbrido de RPG D&D + Pokémon para Foundry VTT v13/v14. Treinadores com classes, perícias e talentos comandam Pokémons com tipos, golpes e habilidades.

## Visão Geral

- **Dois tipos de Actor**: `Treinador` e `Pokémon`.
- **Treinadores** funcionam estilo D&D: 6 atributos com valor (estilo D&D, mod = `floor((valor - 10) / 2)`), 24 perícias padronizadas (4 por atributo), classes que fornecem HP base e perícias, e talentos como features.
- **Pokémons** funcionam estilo jogos: stats numéricos diretos (sem mod), tipos com tabela de eficácia completa, golpes com PP, habilidades, capacidades.
- **Vínculo Treinador → Pokémon**: cada treinador tem uma "party" de até 6 Pokémons (que são Actors separados), com ferramentas para definir o pokémon ativo, abrir as fichas a partir da party do treinador, etc.
- **Base de dados em compendiums**: golpes, habilidades, capacidades, talentos/classes e espécies vivem em packs do Foundry. Os arquivos-fonte são JSONs em `packs/_source/` (versionáveis), compilados para LevelDB em `packs/`.

## Instalação

### Modo Manual

1. Compile os compendiums (instruções abaixo).
2. Copie a pasta `pokemon-rpg/` (toda — com `system.json`, `module/`, `templates/`, `styles/`, `lang/`, `packs/`) para a pasta `Data/systems/` do seu Foundry.
3. Reinicie o Foundry e crie um Mundo usando o sistema **Pokémon RPG**.

### Modo Manifest (futuro)

Se você publicar o `system.json` em algum lugar, pode usar a URL como manifest direto no Foundry.

## Compilando os Compendiums

Os exemplos de Pokémons, golpes, habilidades, etc. ficam como JSONs em `packs/_source/<tipo>/`. Eles **não são lidos diretamente pelo Foundry** — precisam ser compilados em LevelDB.

```bash
# 1. Instale as dependências de build
npm install

# 2. Compile os JSONs em compendiums
npm run build:packs
```

Isso cria pastas em `packs/moves/`, `packs/abilities/` etc. com arquivos LevelDB que o Foundry vai ler.

Para fazer o caminho inverso (extrair conteúdo editado no Foundry de volta para JSON, útil para versionamento):

```bash
npm run unpack:packs
```

E para limpar os packs compilados:

```bash
npm run clean:packs
```

## Estrutura de Diretórios

```
pokemon-rpg/
├── system.json               # manifesto do sistema
├── module/                   # código JavaScript
│   ├── pokemon.mjs           # entry point — registra DataModels e sheets
│   ├── data/                 # DataModels (schema do sistema)
│   │   ├── shared.mjs
│   │   ├── actor-trainer.mjs
│   │   ├── actor-pokemon.mjs
│   │   └── items.mjs
│   ├── documents/            # Classes Actor/Item customizadas
│   │   ├── actor.mjs
│   │   └── item.mjs
│   ├── sheets/               # Fichas (ApplicationV2)
│   │   ├── trainer-sheet.mjs
│   │   ├── pokemon-sheet.mjs
│   │   └── item-sheet.mjs
│   └── helpers/
│       ├── config.mjs        # lista de perícias, tipos, tabela de eficácia
│       └── rolls.mjs         # lógica de rolagens (perícia, atributo, golpe)
├── templates/                # Handlebars
│   ├── actor/
│   ├── item/
│   └── partials/
├── styles/
│   └── pokemon.css
├── lang/                     # traduções
│   ├── pt-BR.json
│   └── en.json
├── packs/                    # compendiums
│   ├── _source/              # JSONs versionáveis (FONTE DE VERDADE)
│   │   ├── moves/
│   │   ├── abilities/
│   │   ├── capacities/
│   │   ├── talents/
│   │   └── species/
│   └── moves/, abilities/... # LevelDB compilado (gerado pelo build)
└── tools/                    # scripts Node.js de build
    ├── build-packs.mjs
    ├── unpack-packs.mjs
    └── clean-packs.mjs
```

## Mecânicas Implementadas

### Atributos

Treinador e Pokémon compartilham os mesmos 6 atributos (Saúde, Ataque, Defesa, Ataque Especial, Defesa Especial, Velocidade), mas funcionam de forma diferente:

- **Treinador**: valores tipicamente 1–20. O modificador é `floor((valor - 10) / 2)`. O HP máximo é derivado: `10 + (mod_saúde × nível)`.
- **Pokémon**: valores diretos (estilo jogos), tipicamente 1–255 ou maior. O HP máximo é derivado: `valor_hp + (nível × 2)`.

Ambas as fórmulas estão em `module/data/actor-*.mjs` e podem ser ajustadas livremente.

### Perícias (Treinador)

24 perícias fixas, 4 por atributo:

| Atributo | Perícias |
|----------|----------|
| Ataque | Corrida, Salto, Força, Intimidação |
| Saúde | Resiliência, Jejum, Apneia, Imunidade |
| Defesa | Incansável, Regeneração, Deflexão, Concentração |
| Atq. Especial | História, Programação, Investigação, Engenharia |
| Velocidade | Prestidigitação, Acrobacia, Performance, Furtividade |
| Def. Especial | Empatia, Manipulação, Percepção, Manha |

Cada perícia tem **mod final = mod do atributo + (proficiência se proficiente) + valor + bônus**, onde `valor` permite somar mais bônus de proficiência (ex: expertise) e `bônus` é um modificador genérico.

A bolinha à esquerda do nome alterna proficiência. Clicar no nome da perícia rola.

### Bônus de Proficiência

Tabela D&D 5e padrão:

| Nível | Proficiência |
|-------|--------------|
| 1–4 | +2 |
| 5–8 | +3 |
| 9–12 | +4 |
| 13–16 | +5 |
| 17–20 | +6 |

### Tipos e Eficácia

Tabela completa de 18 tipos, com efetividade (×0, ×0.5, ×1, ×2). Pokémons com dois tipos combinam multiplicadores. Use `pokemon.system.getTypeEffectiveness("fire")` para calcular.

> Nota: a integração da eficácia no card de dano **não** está aplicada ainda (o roll exibe dano cru). É um bom próximo passo — basta multiplicar `dmgRoll.total` por `target.system.getTypeEffectiveness(move.system.type)` em `helpers/rolls.mjs`.

### Golpes e PP

Cada golpe tem `type` (tipo Pokémon), `category` (físico/especial/status), `power`, `accuracy` (0–100), `pp.value/max`, `damageFormula` (override opcional) e `effect` (texto livre).

A rolagem de golpe:

1. Verifica PP, decrementa.
2. Rola `1d100` contra `accuracy` — se ≤, acerta.
3. Se acertou e o golpe tem `power` e não é status: rola dano.
   - Fórmula default: `ceil(power/10) d6 + atributo`, onde atributo é `atk` (físico) ou `spa` (especial).
   - Pode ser sobrescrita por `damageFormula` no item.
4. Anexa o efeito textual.

### Party

Na aba "Party" do treinador, arraste Actors do tipo Pokémon para adicioná-los à party (máx 6). A ficha do Pokémon ganha automaticamente uma referência ao treinador (`system.details.trainer`).

Você pode definir um pokémon ativo (botão de estrela), abrir a ficha (botão de ID card), ou remover (botão X).

## Próximos Passos / Ideias

Esta é uma v0.1.0 funcional, mas há muito espaço para evoluir:

- Aplicar eficácia de tipos automaticamente no dano.
- Active Effects para condições de status (queima, paralisia, sono, congelamento, envenenamento).
- Tickagem automática de status no início/fim do turno.
- Mecânica de evolução (botão na ficha quando atinge nível requerido).
- Modificador de precisão baseado em diferença de Velocidade entre atacante e defensor.
- Sheets de combate integrado (lista de combatentes, ordem por velocidade).
- Importador de Pokémons (consumindo PokéAPI).

## Licença

Esse repositório é uma base de código distribuída como exemplo educacional. Pokémon™ e todos os personagens, golpes, e habilidades nele referenciados são marcas registradas da Nintendo, Game Freak e The Pokémon Company. Use por sua conta e risco e respeite os direitos autorais — este sistema é destinado a uso pessoal/privado em mesas de RPG não-comerciais.
