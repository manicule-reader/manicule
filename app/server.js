const express = require("express");
const app = express();
app.use(express.static("public"));

let port = 3000;
let hostname = "localhost";

app.listen(port, hostname, () => {
  console.log(`Listening at: http://${hostname}:${port}`);
});