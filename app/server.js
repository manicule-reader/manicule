require("dotenv").config();
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const pool = require("./db/pool");
const path = require("path");
const express = require("express");
const authRoutes = require("./routes/auth");

const app = express();

app.use(
  session({
    store: new pgSession({
      pool: pool,
      tableName: "session",
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/auth", authRoutes);

// Book info + table of contents
app.get("/api/books/:id", async (req, res) => {
  try {
    const book = await pool.query(
      "SELECT id, title, author FROM books WHERE id = $1",
      [req.params.id]
    );
    if (book.rows.length === 0) {
      return res.status(404).json({ error: "Book not found" });
    }
    const sections = await pool.query(
      "SELECT seq, title FROM sections WHERE book_id = $1 ORDER BY seq",
      [req.params.id]
    );
    res.json({ ...book.rows[0], sections: sections.rows });
  } catch (error) {
    console.error("Book fetch error:", error);
    res.status(500).json({ error: "Unable to load book" });
  }
});

// one sections passages + prev/next
app.get("/api/books/:id/sections/:seq", async (req, res) => {
  const id = Number(req.params.id);
  const seq = Number(req.params.seq);
  if (!Number.isInteger(id) || !Number.isInteger(seq)) {
    return res.status(400).json({ error: "Invalid book or section" });
  }
  try {
    const section = await pool.query(
      `SELECT s.id, s.seq, s.title, b.title AS book_title, b.author
       FROM sections s JOIN books b ON b.id = s.book_id
       WHERE s.book_id = $1 AND s.seq = $2`,
      [id, seq]
    );
    if (section.rows.length === 0) {
      return res.status(404).json({ error: "Section not found" });
    }
    const s = section.rows[0];

    const passages = await pool.query(
      "SELECT id, seq, body FROM passages WHERE section_id = $1 ORDER BY seq",
      [s.id]
    );
    const neighbors = await pool.query(
      `SELECT
         (SELECT max(seq) FROM sections WHERE book_id = $1 AND seq < $2) AS prev,
         (SELECT min(seq) FROM sections WHERE book_id = $1 AND seq > $2) AS next`,
      [id, seq]
    );

    res.json({
      book: { id, title: s.book_title, author: s.author },
      section: { seq: s.seq, title: s.title },
      passages: passages.rows,
      prev: neighbors.rows[0].prev,
      next: neighbors.rows[0].next,
    });
  } catch (error) {
    console.error("Section fetch error:", error);
    res.status(500).json({ error: "Unable to load section" });
  }
});

app.get(["/read/:id", "/read/:id/:section"], (req, res) => {
  res.sendFile(path.join(__dirname, "public", "reader.html"));
});


const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Listening at: http://localhost:${port}`);
});