import { randomUUID } from 'crypto';

export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

export const errorHandler = (err, req, res, _next) => {
    const traceId = randomUUID();
    const statusCode = err.status || 500;
    
    console.error(`[Error Trace: ${traceId}]:`, err);

    res.status(statusCode).json({
        success: false,
        message: err.message || 'Error interno del servidor',
        traceId,
        timestamp: new Date().toISOString()
    });
};