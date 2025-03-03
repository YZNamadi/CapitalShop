class ErrorHandler extends Error {
    constructor(statusCode, message) {
        super();
        this.statusCode = statusCode;
        this.message = message;
    }
}

const createError = (statusCode, message) => {
    return new ErrorHandler(statusCode, message);
};

module.exports = createError;
