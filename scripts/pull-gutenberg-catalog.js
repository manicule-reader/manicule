const axios = require("axios");
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
require("dotenv").config();
//dotenv has to load before the pool is required
const pool = require("../app/db/pool");

//grab the contact email from the .env and end early if it's not there
const contact = process.env.gutenberg_contact;
const USER_AGENT = contact
  ? `manicule-school-project (${contact})`
  : "manicule-school-project";

const url = "https://www.gutenberg.org/cache/epub/feeds/pg_catalog.csv.gz";
const cachePath = path.join(__dirname, ".cache/pg_catalog.csv.gz");

async function getCatalogBytes() {
    if (fs.existsSync(cachePath)) {
        //reuse the saved copy so we only hit gutenberg once while developing
        return fs.readFileSync(cachePath);
    }
    const response = await axios.get(url, {
        headers: { "User-Agent": USER_AGENT },
        //get raw bytes instead of letting axios turn them into a string
        responseType: "arraybuffer"
    });
    const data = Buffer.from(response.data);
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFileSync(cachePath, data);
    return data;
}

//"Austen, Jane, 1775-1817" -> "Jane Austen", only the first author is kept
function cleanAuthor(catalogAuthor) {
    const first = (catalogAuthor || "").split(";")[0].replace(/,?\s*\d{3,4}\??\s*-.*$/, "").trim();
    const parts = first.split(",").map((p) => p.trim());
    return parts.length >= 2 ? parts[1] + " " + parts[0] : first;
}

function parseCatalog(raw) {
    //gzip data always starts with the bytes 1f 8b
    const isGzip = raw[0] === 0x1f && raw[1] === 0x8b;
    const csv = (isGzip ? zlib.gunzipSync(raw) : raw).toString("utf8");
    const records = parse(csv, { columns: true, skip_empty_lines: true, bom: true });

    //a map by id, because one upsert statement can't touch the same row twice
    const byId = new Map();
    for (const r of records) {
        //skip audio books and anything else that isn't text
        if (r.Type !== "Text") continue;
        const id = Number(r["Text#"]);
        if (!Number.isInteger(id)) continue;
        byId.set(id, {
            id,
            //titles can contain newlines
            title: r.Title.replace(/\s+/g, " ").trim(),
            author: cleanAuthor(r.Authors) || null,
            language: r.Language || null,
        });
    }
    return [...byId.values()];
}

async function upsertCatalog(entries) {
    //only rows that actually changed get a new updated_at
    const res = await pool.query(
        `INSERT INTO catalog (gutenberg_id, title, author, language)
         SELECT * FROM unnest($1::int[], $2::text[], $3::text[], $4::text[])
         ON CONFLICT (gutenberg_id) DO UPDATE
         SET title = EXCLUDED.title,
             author = EXCLUDED.author,
             language = EXCLUDED.language,
             updated_at = now()
         WHERE (catalog.title, catalog.author, catalog.language)
               IS DISTINCT FROM (EXCLUDED.title, EXCLUDED.author, EXCLUDED.language)`,
        [
            entries.map((e) => e.id),
            entries.map((e) => e.title),
            entries.map((e) => e.author),
            entries.map((e) => e.language),
        ]
    );
    return res.rowCount;
}

async function main() {
    try {
        const entries = parseCatalog(await getCatalogBytes());
        console.log("parsed", entries.length, "text entries");
        const changed = await upsertCatalog(entries);
        console.log("inserted or updated", changed, "rows");
    } catch (error) {
        console.log(error.message);
        process.exitCode = 1;
    } finally {
        //without this the open pool keeps the process from exiting
        await pool.end();
    }
}

main();