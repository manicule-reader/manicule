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

app.get("/api/books/:id", async (req, res) => {
  try {
    const book = await pool.query(
      "SELECT id, title, author FROM books WHERE id = $1",
      [req.params.id]
    );
    if (book.rows.length === 0) {
      return res.status(404).json({ error: "Book not found" });
    }

    const passages = await pool.query(
      "SELECT id, seq, body FROM passages WHERE book_id = $1 ORDER BY seq",
      [req.params.id]
    );

    res.json({ ...book.rows[0], passages: passages.rows });
  } catch (error) {
    console.error("Book fetch error:", error);
    res.status(500).json({ error: "Unable to load book" });
  }
});

app.get("/read/:id", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "reader.html"));
});


const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Listening at: http://localhost:${port}`);
});