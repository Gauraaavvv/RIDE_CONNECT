// Request logging middleware for debugging
const requestLogger = (req, res, next) => {
  // Only log in development or when explicitly enabled
  if (process.env.NODE_ENV === 'development' || process.env.ENABLE_REQUEST_LOGGING === 'true') {
    console.log('=== INCOMING REQUEST ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Method:', req.method);
    console.log('URL:', req.originalUrl);
    console.log('Headers:', {
      'content-type': req.get('content-type'),
      'user-agent': req.get('user-agent'),
      'authorization': req.get('authorization') ? '[REDACTED]' : undefined
    });
    
    // Log body for POST/PUT requests (excluding sensitive data)
    if (req.method === 'POST' || req.method === 'PUT') {
      const logBody = { ...req.body };
      
      // Redact sensitive fields
      const sensitiveFields = ['password', 'token', 'secret', 'key'];
      sensitiveFields.forEach(field => {
        if (logBody[field]) {
          logBody[field] = '[REDACTED]';
        }
      });
      
      console.log('Body:', logBody);
    }
    
    console.log('=== END REQUEST ===');
  }
  
  next();
};

module.exports = requestLogger;
