const axios = require("axios");
const contact = process.env.gutenberg_contact;
if (!contact) {
  console.log("Set gutenberg_contact in .env");
  process.exit(1);
}

const BASE = "https://mirrors.xmission.com/gutenberg/";

//pure function, easy to test
function bookDirUrl(id) {
  let url = BASE;
  if (id.length === 1) {
    url += "0/";
  }
  for (let i = 0; i < id.length - 1; i++) {
    url += `${id.charAt(i)}/`;
  }
  return url + `${id}/`;
}

//returns the raw text, or null if every candidate 404s. throws on anything else
async function fetchFromMirror(id) {
  const dir = bookDirUrl(id);
  //gutenberg isn't consistent about filenames
  const filenames = [`${id}-0.txt`, `${id}.txt`, `${id}-8.txt`];

  for (const filename of filenames) {
    try {
      const response = await axios.get(dir + filename, {
        headers: { "User-Agent": "manicule-testing (" + contact + ")" },
      });
      return response.data;
    } catch (error) {
      //only keep trying if the file wasn't found
      if (error.response && error.response.status === 404) continue;
      throw error;
    }
  }
  return null;
}

module.exports = { bookDirUrl, fetchFromMirror };