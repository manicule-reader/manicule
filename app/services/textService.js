const { fetchFromMirror } = require("../lib/mirror");
const { splitSections } = require("../lib/splitSections");

//returns the text, or null if it doesn't exist
async function getText(id) {
  //later: check the db first and return early if we already have it
  return importText(id);
}

async function importText(id) {
  const raw = await fetchFromMirror(id);
  if (raw === null) return null;

  //later: clean the text here, then upsert it into the db
  const sections = splitSections(raw);
//   for (const s of sections) {
//     console.log(s.title, '-', s.passages.length, 'passages');
//     console.log(s.passages.slice(0, 5));
//   }
  return sections;
}

module.exports = { getText, importText };