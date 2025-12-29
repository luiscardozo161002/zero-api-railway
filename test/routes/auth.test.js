'use strict';

const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const { getServer } = require('../helpers/server');

const { expect } = Code;
const { describe, it, before, beforeEach, after } = (exports.lab = Lab.script());

describe('Auth Service - Basic Strategy', () => {
  let server;
  let authService;
  let cryptoService;
  let userId;
  const email = 'iscervant@gmail.com';
  const password = 'Pass#Dev2024';
  const invalidPassword = 'Pass#Dev2023';
  const userAgent = 'PostmanRuntime/7.43.0';
  const ipAddress = '127.0.0.1';

  before(async () => {
    server = await getServer();
    const { User } = server.models();
    ({ authService, cryptoService } = server.services());

    const password_hash = await cryptoService.bcrypt(password);

    // Crear usuario de prueba
    ({ id: userId } = await User.query().insertAndFetch({
        email,
        password_hash,
        name: 'Testing User',
        username: 'testuser',  
        is_active: true,
        is_blocked: false,
        role_id: 1 
    }));
  });

  describe('Successful Login', () => {
    it('should return jwt, refreshToken and user on successful login', async () => {
      const result = await authService.basic({ 
        email, 
        password,
        ipAddress,
        userAgent
      });

      expect(result).to.include(['jwt', 'refreshToken', 'user']);
      expect(result.jwt).to.be.string();
      expect(result.refreshToken).to.be.string();
      expect(result.user).to.be.object();
      expect(result.user.email).to.equal(email);
    });

    it('should create a new session for first time device login', async () => {
      const { UserSession } = server.models();
      await authService.basic({ 
        email, 
        password,
        ipAddress: '192.168.1.1',
        userAgent: 'Tablet'
      });

      const session = await UserSession.query()
        .where('user_id', userId)
        .where('ip_address', '192.168.1.1')
        .first();

      expect(session).to.exist();
      expect(session.is_active).to.be.true();
    });

    it('should update existing session for same device login', async () => {
      const { UserSession } = server.models();
      
      // Primera autenticación
      const firstLogin = await authService.basic({ 
        email, 
        password,
        ipAddress,
        userAgent
      });

      // Segunda autenticación
      const secondLogin = await authService.basic({ 
        email, 
        password,
        ipAddress,
        userAgent
      });

      const sessions = await UserSession.query()
        .where('user_id', userId)
        .where('ip_address', ipAddress)
        .where('is_active', true);

      expect(sessions).to.have.length(1);
      expect(sessions[0].token).to.equal(secondLogin.jwt);
    });
  });

  describe('Failed Login Attempts', () => {
    beforeEach(async () => {
        const { User, LoginAttempt } = server.models();
        await LoginAttempt.query().delete().where('user_id', userId);
        await User.query().patch({ 
            is_blocked: false, 
            blocked_until: null,
            is_active: true 
        }).where('id', userId);
    });

    it('should record failed login attempt', async () => {
      const { LoginAttempt } = server.models();
      
      try {
        await authService.basic({ 
          email, 
          password: invalidPassword,
          ipAddress,
          userAgent
        });
      } catch (err) {
        const attempt = await LoginAttempt.query()
          .where('user_id', userId)
          .where('success', false)
          .orderBy('created_at', 'desc')
          .first();

        expect(attempt).to.exist();
        expect(attempt.ip_address).to.equal(ipAddress);
        expect(attempt.user_agent).to.equal(userAgent);
      }
    });

    it('should reject login attempts when user is blocked', async () => {
      const { User, LoginAttempt } = server.models();
      
      // Bloquear usuario
      await User.query()
        .patch({
          is_blocked: true,
          blocked_until: new Date(Date.now() + 30 * 60000) // 30 minutos
        })
        .where('id', userId);

      try {
        await authService.basic({ 
          email, 
          password,
          ipAddress,
          userAgent
        });

        expect.fail('Debería haber fallado');

        

      } catch (err) {
        expect(err.output.statusCode).to.equal(429);
      }
    });
  });

  describe('Invalid Scenarios', () => {
    it('should reject inactive users', async () => {
      const { User, LoginAttempt } = server.models();

      await LoginAttempt.query().delete().where('user_id', userId);
        await User.query()
            .patch({ is_blocked: false, blocked_until: null })
            .where('id', userId);
      
      // Desactivar usuario
      await User.query()
        .patch({ is_active: false })
        .where('id', userId);

      try {
        await authService.basic({ 
          email, 
          password,
          ipAddress,
          userAgent
        });
        expect.fail('Debería haber fallado');
      } catch (err) {
        expect(err.output.statusCode).to.equal(403);
      }
    });

    it('should reject invalid credentials', async () => {
      try {
        const { User } = server.models();
        await User.query()
            .patch({ is_active: true })
            .where('id', userId);

        await authService.basic({ 
          email, 
          password: invalidPassword,
          ipAddress,
          userAgent
        });
        expect.fail('Debería haber fallado');
      } catch (err) {
        expect(err.output.statusCode).to.equal(401);
      }
    });

    it('should reject non-existent users', async () => {
        try {
            await authService.basic({ 
                email: 'x@gi-de.io', 
                password,
                ipAddress,
                userAgent
            });
            expect.fail('Debería haber fallado');
        } catch (err) {
            expect(err).to.be.an.instanceof(Error);
            expect(err.name).to.equal('NotFoundError');
        }
    });
  });

  after(async () => {
    const { User, UserSession, LoginAttempt } = server.models();
    // Limpiar datos de prueba
    await LoginAttempt.query().delete().where('user_id', userId);
    await UserSession.query().delete().where('user_id', userId);
    await User.query().delete().where('id', userId);
  });
});