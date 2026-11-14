const { fetchFromMirror } = require("../lib/mirror");
const { splitSections } = require("../lib/splitSections");
const { saveBook } = require("../lib/saveBook");
const { getCatalogEntry } = require("../lib/catalog");
const pool = require("../db/pool");

async function findBook(id) {
  const { rows } = await pool.query(
    'SELECT id, title, author FROM books WHERE gutenberg_id = $1',
    [id]
  );
  return rows[0] || null;
}

//returns the text, or null if it doesn't exist
async function getText(id) {
  //later: check the db first and return early if we already have it
  let inDB = await findBook(id);
  if (inDB) {
    //load the already-downloaded rows from the db
    console.log('already got it');
    return null;
  }

  return importText(id);
}

async function importText(id) {
  //title and author come from the catalog, not the text
  const meta = await getCatalogEntry(id);
  if (meta === null) return null;

  const raw = await fetchFromMirror(id);
  if (raw === null) return null;

  const sections = splitSections(raw);
  if (sections.length === 0) return null;

  await saveBook({
    gutenbergId: id,
    title: meta.title,
    author: meta.author,
    sections,
  });
  return raw;
}

module.exports = { getText, importText };