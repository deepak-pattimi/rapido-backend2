const validate = (schema) => (req, res, next) => {
  try {
    // This strictly checks req.body against our Zod rules
    schema.parse(req.body);
    next(); // Data is safe, move to the controller!
  } catch (error) {
    // If validation fails, Zod gives us a beautiful array of exactly what went wrong
    return res.status(400).json({ 
      success: false, 
      error: "Invalid data provided", 
      details: error.errors.map(err => ({ field: err.path.join('.'), message: err.message }))
    });
  }
};

module.exports = validate;