function errorHandler(err, req, res, next) {
    console.error(err.stack);
    
    // Check if error is from Zod validation
    if (err.name === 'ZodError' || err instanceof require('zod').ZodError) {
        const issues = err.errors || err.issues || [];
        const message = issues.map(e => e.message).join(', ') || 'Validation error';
        req.flash('error', message);
        return res.redirect('back');
    }

    // Default error handling
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';

    if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
        return res.status(status).json({ error: message });
    }

    // Operational errors thrown intentionally (e.g. from Services) — show the message to user
    if (status < 500 || (err.name === 'Error' && !err.status)) {
        req.flash('error', message);
        return res.redirect('back');
    }

    req.flash('error', 'Something went wrong. Please try again later.');
    res.redirect('back');
}

module.exports = errorHandler;
