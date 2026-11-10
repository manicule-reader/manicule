let axios = require("axios");
let zlib = require("zlib");
let fs = require("fs");
let path = require("path");
require("dotenv").config();

//grab the contact email from the .env and end early if it's not there
const contact = process.env.gutenberg_contact;
if (!contact) {
    console.log("Set gutenberg_contact in .env.json");
    process.exit(1);
}

let url = "https://www.gutenberg.org/cache/epub/feeds/pg_catalog.csv.gz";
let cachePath = path.join(__dirname, ".cache/pg_catalog.csv.gz");

function showFirstLines(raw) {
    //gzip data always starts with the bytes 1f 8b
    let isGzip = raw[0] === 0x1f && raw[1] === 0x8b;
    let csv = (isGzip ? zlib.gunzipSync(raw) : raw).toString("utf8");

    csv.split("\n").slice(0, 5).forEach((line) => console.log(line));
}

if (fs.existsSync(cachePath)) {
    //reuse the saved copy so we only hit gutenberg once while developing
    //TODO change to upserting to DB instead of printing
    showFirstLines(fs.readFileSync(cachePath));
} else {
    axios.get(url, {
        headers: {
            "User-Agent": "manicule-testing (" + contact + ")"
        },
        //get raw bytes instead of letting axios turn them into a string
        responseType: "arraybuffer"
    }).then((response) => {
        let data = Buffer.from(response.data);
        //this is just a simple single-file cache as no more is truly needed for a one-off request
        fs.mkdirSync(path.dirname(cachePath), { recursive: true });
        fs.writeFileSync(cachePath, data);
        showFirstLines(data);
    }).catch((error) => {
        console.log(error.message);
        process.exit(1);
    });
}