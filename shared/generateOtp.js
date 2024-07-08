const otpGenerator = require('otp-generator');
module.exports = function () {
    return otpGenerator.generate(6, { lowerCaseAlphabets:false, upperCaseAlphabets:false, specialChars:false})
};