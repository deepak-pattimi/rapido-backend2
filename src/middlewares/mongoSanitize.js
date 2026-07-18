const sanitizeObject = (obj) => {
  if (obj instanceof Object) {
    for (const key in obj) {
      if (/^\$/.test(key)) {
        // Delete keys starting with $ (e.g. $gt, $ne) to prevent NoSQL injection
        delete obj[key];
      } else {
        sanitizeObject(obj[key]);
      }
    }
  }
};

const mongoSanitize = (req, res, next) => {
  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);
  next();
};

module.exports = mongoSanitize;
