require("dotenv").config();
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const pool = require("./db/pool");
const path = require("path");
const express = require("express");
const authRoutes = require("./routes/auth");
const groupRoutes = require("./routes/groups");

const app = express();

// trust render
app.set("trust proxy", 1);

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
app.use("/api/groups", groupRoutes);

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Listening at: http://localhost:${port}`);
});