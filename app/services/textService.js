const { fetchFromMirror } = require("../lib/mirror");

//returns the text, or null if it doesn't exist
async function getText(id) {
  //later: check the db first and return early if we already have it
  return importText(id);
}

async function importText(id) {
  const raw = await fetchFromMirror(id);
  if (raw === null) return null;

  //later: clean the text here, then upsert it into the db
  return raw;
}

module.exports = { getText, importText };