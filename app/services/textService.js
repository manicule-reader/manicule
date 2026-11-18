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
  //check the db first and return early if we already have it
  let inDB = await findBook(id);
  if (inDB) {
    return;
  }

  return importText(id);
}

//orchestrator of the entire "importing a text" process if we don't already have it
async function importText(id) {
  //title and author come from the catalog, not the text
  const meta = await getCatalogEntry(id);
  if (meta === null) return null;

  const raw = await fetchFromMirror(id);
  if (raw === null) return null;

  const sections = splitSections(raw);

  //no headings were found, so the whole text is one section named after the book
  if (sections.length === 1 && sections[0].title === 'Front Matter') {
    sections[0].title = meta.title;
  }

  //will throw if the sections are not as expected
  checkSections(sections);

  await saveBook({
    gutenbergId: id,
    title: meta.title,
    author: meta.author,
    sections,
  });
  return raw;
}

//thrown when a book's layout isn't something the splitter handles yet
class UnsupportedFormatError extends Error {}

function checkSections(sections) {
  if (sections.length === 0) {
    console.log("1");
    throw new UnsupportedFormatError('no sections found');
  }
  
  const total = sections.reduce((n, s) => n + s.passages.length, 0);

  //front matter should be a small slice of the book, not most of it
  if (sections[0].title === 'Front Matter' && sections[0].passages.length > total / 2) {
    console.log("2");
    throw new UnsupportedFormatError('most of the text is before the first heading');
  }
}

module.exports = { getText, importText, UnsupportedFormatError};