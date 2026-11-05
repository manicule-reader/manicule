require("dotenv").config();
const path = require("path");
const express = require("express");
const authRoutes = require("./routes/auth");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/auth", authRoutes);

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Listening at: http://localhost:${port}`);
});