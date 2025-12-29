'use strict';

const Schmervice = require('@hapipal/schmervice');
const Bcrypt = require('bcrypt');
const Jwt = require('@hapi/jwt');
const { createHash, randomBytes, randomInt } = require('crypto');
const { Config } = require('../../server/manifest');

const [key] = Config.get('/JWT_SECRETS');

module.exports = class CryptoService extends Schmervice.Service {
  constructor(...args) {
    super(...args);
  }

  /**
   *
   * @param {string} payload
   * @returns {string}
   */
  sha256(payload) {
    return createHash('sha256').update(payload).digest('hex');
    // 90e01f53ccf8a2994a4e39cdebda23bcf768013d444baae9820bb42d5127ab04
  }

  /**
   *
   * @param {string} payload
   * @returns {string}
   */
  stringToUuid(payload) {
    const hash = this.sha256(payload);

    const firstPart = hash.slice(0, 8);
    const secondPart = hash.slice(8, 12);
    const thirdPart = hash.slice(12, 16);
    const fourthPart = hash.slice(16, 20);
    const fifthPart = hash.slice(20, 32);

    return `${firstPart}-${secondPart}-${thirdPart}-${fourthPart}-${fifthPart}`;
    // 90e01f53-ccf8-a299-4a4e-39cdebda23bc
  }

  /**
   *
   * @param {*} params: {email, sub, scope}
   * @param {*} overrides: {key}
   * @returns jwt
   */
  jwt({ email, sub, scope: _scope, exp, bill, organization_id }, { key: k } = {}) {
    const scope = [..._scope, 'user', `user:${sub}`, `user:${email}`].filter(
      (s) => s && s.length > 0 && !s.includes('undefined')
    );
    return Jwt.token.generate(
      {
        sub,
        email: email || undefined,
        scope,
        bill: bill || undefined,
        exp: exp || undefined,
        organization_id: organization_id || undefined
      },
      { key: k || key }
    );
  }

  async bcrypt(password = null) {
    const saltRounds = 13;
    if (password === null || password === '') {
      password = randomBytes(10).toString('hex');
    }

    return (await Bcrypt.hash(password, saltRounds)).toString();
  }

  async compare(password, hash) {
    return await Bcrypt.compare(password, hash);
  }

  getRandomEmailConfirmationCode() {
    return randomInt(100000, 999999).toString();
  }
};
