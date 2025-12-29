'use strict';

const Schmervice = require('@hapipal/schmervice');
const { Config } = require('../../server/manifest');

const { hostFrontend } = Config.get('/FRONTEND_HOST');
const termsUrl = Config.get('/T_O_S');
const privacyPolicyUrl = Config.get('/PRIVACY_POLICY');

module.exports = class NotificationsService extends Schmervice.Service {
  constructor(...args) {
    super(...args);
  }

  /**
   * Send a notification when create a new account to confirm email or when user request a new confirmation code
   * @param {string} username
   * @param {string} email
   * @param {string} confirmationCode
   * @returns {Promise<any>}
   */
  async confirmationCode(username, email, confirmationCode) {
    const { emailService } = this.server.services();

    const body = {
      hostFrontend,
      confirmationCode,
      termsUrl,
      privacyPolicyUrl
    };

    const sendedEmail = await emailService.send(
      username,
      'confirmationCode',
      body,
      email,
      `Confirmación de correo electrónico`
    );
    return sendedEmail;
  }

  /**
   * Send a notification when a user want to recover his/her password
   * @param {string} fromUser
   * @param {string} username
   * @param {string} email
   * @param {string} subject
   * @param {string} recoveryUrl
   * @returns {Promise<any>}
   */
  async recoveryToken(fromUser, username, email, subject, recoveryUrl) {
    const { emailService } = this.server.services();

    const body = {
      hostFrontend,
      fromUser,
      subject,
      recoveryUrl,
      termsUrl,
      privacyPolicyUrl
    };

    const sendedEmail = await emailService.send(username, 'recoveryToken', body, email, subject);
    return sendedEmail;
  }

  /**
   * Send a welcome Email when a new account is created and verified
   * @param {string} name
   * @param {string} email
   * @param {string} subject
   * @param {string} body
   * @returns {Promise<any>}
   */
  async documentNotification(name, email, subject, body, attachments = []) {
    const { emailService } = this.server.services();

    const sendedEmail = await emailService.send(
      name,
      undefined,
      body,
      email,
      subject,
      attachments,
      '__emailFooterWithoutSign'
    );
    return sendedEmail;
  }

  /**
   * Send a welcome Email when a new account is created and verified
   * @param {string} username
   * @param {string} email
   * @returns {Promise<any>}
   */
  async welcomeEmail(username, email) {
    const { emailService } = this.server.services();

    const body = {
      hostFrontend,
      termsUrl,
      privacyPolicyUrl
    };

    const sendedEmail = await emailService.send(
      username,
      'welcome',
      body,
      email,
      `¡Bienvenido(a) a G&D!`,
      undefined,
      '__emailFooterWithoutSign'
    );
    return sendedEmail;
  }
};
