const jwt = require('jsonwebtoken');
const config = require('config');

module.exports = function (req, res, next) {
  const token = req.header('x-auth-token');

  if (!token) {
    req.company = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.get('jwtSecret'));
    req.company = decoded.company;
    next();
  } catch (error) {
    return res.status(401).json({ msg: 'Invalid token. Authorization denied.' });
  }
};
