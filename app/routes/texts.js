const express = require("express");
const validateTextId = require("../middleware/validateTextId");
const { getText, UnsupportedFormatError } = require("../services/textService");

const router = express.Router();

router.get("/:id", validateTextId, async (req, res) => {
  // try {
  //   const text = await getText(req.params.id);
  //   if (text === null) return res.status(404).send();
  //   res.send(text);
  // } catch (error) {
  //   console.log(error);
  //   //the mirror failed, not us
  //   res.status(502).send();
  // }
  try {
    const text = await getText(req.params.id);
    if (text === null) return res.status(404).json({ error: 'not found' });
    res.send();
  } catch (err) {
    if (err instanceof UnsupportedFormatError) {
      return res.status(422).json({ error: 'this text has a format we cannot import yet' });
    }
    console.error(err);
    //don't send err.message to the client, it can contain db details
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;