const pool = require("../db/pool");

//returns { title, author } or null if the id isn't a text in the catalog
async function getCatalogEntry(id) {
  const { rows } = await pool.query(
    'SELECT title, author FROM catalog WHERE gutenberg_id = $1',
    [id]
  );
  return rows[0] || null;
}

module.exports = { getCatalogEntry };