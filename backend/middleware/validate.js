// Validates req.body / req.params / req.query against zod schemas.
// Parsed values are stored on req.valid so controllers use clean, typed data.
// (Express 5 makes req.query read-only, so we don't overwrite it.)
function validate(schemas) {
  return (req, res, next) => {
    req.valid = req.valid || {};
    for (const part of ['params', 'query', 'body']) {
      if (schemas[part]) {
        req.valid[part] = schemas[part].parse(req[part] ?? {});
      }
    }
    next();
  };
}

module.exports = validate;
