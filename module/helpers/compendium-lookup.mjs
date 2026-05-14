/**
 * compendium-lookup.mjs — busca utilitária por items no compendium.
 *
 * Procura items de um tipo específico (move | ability | capacity | species)
 * por nome exato (case-insensitive) em todos os packs de Item disponíveis.
 *
 * Retorna array de objects (resultado de `doc.toObject()`) pronto pra usar
 * em `createEmbeddedDocuments`.
 */

export async function findItemsByName(type, names) {
  if ( !names || !names.length ) return [];
  const wanted = new Set(
    names.map(n => String(n).trim().toLowerCase()).filter(Boolean)
  );
  if ( !wanted.size ) return [];

  const itemPacks = (game.packs ?? []).filter(p => p.metadata?.type === "Item");
  const found = [];
  const foundNames = new Set();

  for ( const pack of itemPacks ) {
    if ( foundNames.size === wanted.size ) break;
    try {
      const index = await pack.getIndex({ fields: ["type"] });
      for ( const entry of index ) {
        if ( entry.type !== type ) continue;
        const norm = String(entry.name).trim().toLowerCase();
        if ( !wanted.has(norm) || foundNames.has(norm) ) continue;
        const doc = await pack.getDocument(entry._id);
        if ( doc ) {
          found.push(doc.toObject());
          foundNames.add(norm);
        }
      }
    } catch (err) {
      console.warn(`pokemon-rpg | falha ao buscar em ${pack.collection}:`, err);
    }
  }

  if ( foundNames.size < wanted.size ) {
    const missing = [...wanted].filter(n => !foundNames.has(n));
    console.warn(`pokemon-rpg | não encontrados (${type}): ${missing.join(", ")}`);
  }
  return found;
}
