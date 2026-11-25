// A small error type that carries a short code and a friendly message.
// The web layer turns these into proper messages for the user.
class AppError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
module.exports = { AppError };
