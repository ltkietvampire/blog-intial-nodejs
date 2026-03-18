function errorHandler(err, req, res, next) {
    console.error(err.stack);
    
    // Check if error is from Zod validation
    if (err.name === 'ZodError') {
        const message = err.errors.map(e => e.message).join(', ');
        req.flash('error', message);
        return res.redirect('back');
    }

    // Default error handling
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';

    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(status).json({ error: message });
    }

    req.flash('error', 'Something went wrong. Please try again later.');
    res.redirect('back');
}

module.exports = errorHandler;
