//only digits, so nobody can inject path segments into the mirror url
function validateTextId(req, res, next) {
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(400).send();
  }
  next();
}

module.exports = validateTextId;