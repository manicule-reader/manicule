// let envFile = require("../.env.json");
// let contact = envFile["gutenberg_contact"];
// if (!contact) {
//     console.log("Set gutenberg_contact in .env.json");
//     process.exit(1);
// }

require("dotenv").config();
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const pool = require("./db/pool");
const path = require("path");
const express = require("express");
const axios = require("axios");
const authRoutes = require("./routes/auth");

const app = express();

// trust render
app.set("trust proxy", 1);

const contact = process.env.gutenberg_contact;
if (!contact) {
  console.log("Set gutenberg_contact in .env.json");
  process.exit(1);
}

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


app.get("/import-text/:id", async (req, res) => {
  let baseUrl = "https://mirrors.xmission.com/gutenberg/";
  //id will be a string
  let id = req.params.id;
  let idLength = id.length;

  if (idLength === 1) {
    baseUrl += "0";
  }

  for (let i=0; i<idLength-1; i++) {
    baseUrl += `${id.charAt(i)}/`;
  }
  baseUrl += `${id}/`;

  //filenames to try in order, gutenberg isn't consistent about these
  const filenames = [`${id}-0.txt`, `${id}.txt`, `${id}-8.txt`];

  for (const filename of filenames) {
    const url = baseUrl + filename;
    console.log(url);

    try {
      const response = await axios.get(url, {
        headers: {
          "User-Agent": "manicule-testing (" + contact + ")"
        },
      });

      console.log("Received response:", response.status);
      return res.send(response.data);
    } catch (error) {
      //only keep trying if the file wasn't found
      if (error.response && error.response.status === 404) {
        console.log(`404 for ${filename}, trying next`);
        continue;
      }

      console.log(error);
      return res.status(500).send();
    }
  }

  //every candidate 404'd
  res.status(404).send();
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Listening at: http://localhost:${port}`);
});