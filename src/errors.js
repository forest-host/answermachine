
export class HTTPError extends Error {
  static status_code() { return 500 }
}

export class NotFoundError extends Error {
  static status_code() { return 404 }

  constructor(error_text = 'Resource not found') {
    this.error_text = error_text;
  }
}
