const pool = require("../db/pool");

//writes the book, its sections and its passages in one transaction
//sections is the numbered output of splitSections: [{ seq, title, passages: [{ seq, body }] }]
//returns the new book id, or null if the book was already in the db
async function saveBook({ gutenbergId, title, author, sections }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const bookRes = await client.query(
      `INSERT INTO books (gutenberg_id, title, author)
       VALUES ($1, $2, $3)
       ON CONFLICT (gutenberg_id) DO NOTHING
       RETURNING id`,
      [gutenbergId, title, author]
    );
    //no row back means another request already imported this book
    if (bookRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    const bookId = bookRes.rows[0].id;

    //unnest turns the arrays into rows, so this is one insert no matter how many sections
    const sectionRes = await client.query(
      `INSERT INTO sections (book_id, seq, title)
       SELECT $1, * FROM unnest($2::int[], $3::text[])
       RETURNING id, seq`,
      [bookId, sections.map(s => s.seq), sections.map(s => s.title)]
    );
    //map each section seq to the id the db gave it
    const sectionIdBySeq = new Map(sectionRes.rows.map(r => [r.seq, r.id]));

    const sectionIds = [];
    const seqs = [];
    const bodies = [];
    for (const s of sections) {
      for (const p of s.passages) {
        sectionIds.push(sectionIdBySeq.get(s.seq));
        seqs.push(p.seq);
        bodies.push(p.body);
      }
    }
    await client.query(
      `INSERT INTO passages (book_id, section_id, seq, body)
       SELECT $1, * FROM unnest($2::int[], $3::int[], $4::text[])`,
      [bookId, sectionIds, seqs, bodies]
    );

    await client.query('COMMIT');
    return bookId;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { saveBook };