const crypto = require("crypto");
const PW_CHARS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no look-alike characters
const tempPassword = () => Array.from({ length: 10 }, () => PW_CHARS[crypto.randomInt(PW_CHARS.length)]).join("");
const codeHash = (salt, code) => crypto.createHmac("sha256", salt).update(code).digest("hex");
const resetCode = () => String(crypto.randomInt(100000, 1000000));
module.exports = { tempPassword, codeHash, resetCode };
