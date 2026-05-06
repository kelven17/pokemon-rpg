/**
 * Campos compartilhados entre fichas de Trainer e Pokémon.
 * Foundry v13+ usa foundry.data.fields para definir schemas tipados.
 */

const { SchemaField, NumberField, StringField, HTMLField, BooleanField, ArrayField, ObjectField } = foundry.data.fields;

/**
 * Bloco de atributos comum às duas fichas.
 * Em Trainer: valores estilo D&D (1-20+), usados como modificador.
 * Em Pokémon: valores diretos estilo jogos (stats brutos).
 *
 * Cada atributo tem `value` (base) e `mod` (calculado em prepareDerivedData).
 */
export function makeAttributesField() {
  const attrField = (initial) => new SchemaField({
    value: new NumberField({
      required: true, nullable: false, integer: true, initial: initial, min: 0
    }),
    mod: new NumberField({
      required: true, nullable: false, integer: true, initial: 0
    })
  });

  return new SchemaField({
    hp:  attrField(10),
    atk: attrField(10),
    def: attrField(10),
    spa: attrField(10),
    spd: attrField(10),
    spe: attrField(10)
  });
}

/**
 * HP atual e máximo. Separado dos atributos por ser um pool de combate.
 * O máximo é derivado, mas armazenamos `max` para overrides manuais.
 */
export function makeHpField() {
  return new SchemaField({
    value: new NumberField({ required: true, nullable: false, integer: true, initial: 10, min: 0 }),
    max:   new NumberField({ required: true, nullable: false, integer: true, initial: 10, min: 0 }),
    temp:  new NumberField({ required: true, nullable: false, integer: true, initial: 0,  min: 0 })
  });
}

/**
 * Bloco de biografia/descrição em comum.
 */
export function makeBiographyField() {
  return new SchemaField({
    value: new HTMLField({ required: true, initial: "" }),
    notes: new HTMLField({ required: true, initial: "" })
  });
}

export const fieldHelpers = {
  SchemaField, NumberField, StringField, HTMLField, BooleanField, ArrayField, ObjectField
};
