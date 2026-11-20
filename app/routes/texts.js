const express = require("express");
const validateTextId = require("../middleware/validateTextId");
const { getText, UnsupportedFormatError } = require("../services/textService");

const router = express.Router();

router.get("/:id", validateTextId, async (req, res) => {
  try {
    const id = await getText(req.params.id);
    if (id === null) {return res.status(404).json({ error: 'not found' });}
    else if (id === -1) {console.log("Text already in DB");}
    else {console.log(`Text id ${id} uploaded to DB`);}
    res.send();
  } catch (err) {
    if (err instanceof UnsupportedFormatError) {
      return res.status(422).json({ error: 'this text has a format we cannot import yet' });
    }
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;