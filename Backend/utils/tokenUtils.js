const crypto = require('crypto');
exports.generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
}
exports.hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
}
// Generate a 6-digit numeric OTP
exports.generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};