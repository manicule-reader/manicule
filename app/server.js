let envFile = require("../.env.json");
let contact = envFile["gutenberg_contact"];
if (!contact) {
    console.log("Set gutenberg_contact in .env.json");
    process.exit(1);
}

const axios = require("axios");
const express = require("express");
const app = express();
app.use(express.static("public"));

let port = 3000;
let hostname = "localhost";

app.get("/import-text/:id", (req, res) => {
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

  let url = baseUrl + `${id}-0.txt`;

  console.log(url);

  axios.get(url, {
    headers: {
      "User-Agent": "manicule-testing (" + contact + ")"
    },
  }).then((response) => {
    console.log("Received response:", response);

    res.send(response.data);
  }).catch(error => {
    console.log(error);
    res.status(500).send();
  })
});

app.listen(port, hostname, () => {
  console.log(`Listening at: http://${hostname}:${port}`);
});