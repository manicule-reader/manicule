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

app.listen(port, hostname, () => {
  console.log(`Listening at: http://${hostname}:${port}`);
});