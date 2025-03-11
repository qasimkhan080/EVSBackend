const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  email: { type: String, required: true },
  companyRefId: { type: String, required: true },
  token: { type: String, required: true },
  expiresAt: { type: Date, required: true },
});

const Token = mongoose.model('Token', tokenSchema);

module.exports = Token;
