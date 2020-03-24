
export class HTTPError extends Error {
  constructor(code, message) {
    super(message);
    this.status_code = code;
  }
}
