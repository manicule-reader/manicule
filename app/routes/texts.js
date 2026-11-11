const express = require("express");
const validateTextId = require("../middleware/validateTextId");
const { getText } = require("../services/textService");

const router = express.Router();

router.get("/:id", validateTextId, async (req, res) => {
  try {
    const text = await getText(req.params.id);
    if (text === null) return res.status(404).send();
    res.send(text);
  } catch (error) {
    console.log(error);
    //the mirror failed, not us
    res.status(502).send();
  }
});

module.exports = router;