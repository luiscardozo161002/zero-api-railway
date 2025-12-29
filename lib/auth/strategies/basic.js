'use strict';

module.exports = () => ({
  name: 'basic',
  scheme: 'basic',
  options: {
    allowEmptyUsername: false,
    validate: (request, email, password) => {
      email = email.toLowerCase();

      return request
        .services()
        .authService.basic({
          email,
          password,
          ipAddress: request.info.remoteAddress,
          userAgent: request.headers['user-agent']
        })
        .then(({ jwt, user }) => {
          return {
            isValid: true,
            credentials: {
              email,
              jwt,
              id: user.id,
              ipAddress: request.info.remoteAddress,
              userAgent: request.headers['user-agent']
            }
          };
        })
        .catch((err) => {
          // Manejar diferentes tipos de error
          if (err.isBoom) {
            if (err.output.statusCode === 429) {
              throw err; // Re-lanzar error de too many requests
            }
          }

          return {
            isValid: false,
            error: err
          };
        });
    }
  }
});
