'use strict';

const Schmervice = require('@hapipal/schmervice');
const { internal } = require('@hapi/boom');
const { Config } = require('../../server/manifest');
const Fs = require('fs');
const Path = require('path');

const { host, port, user, pass, from } = Config.get('/SMTP');

const mailer = require('nodemailer').createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USERNAME,
    pass: process.env.SMTP_PASSWORD
  }
});

mailer.on('idle', () => console.log('at least 1 mailer conn is idle/can be used to send msg'));

module.exports = class EmailService extends Schmervice.Service {
  constructor(...args) {
    super(...args);
  }

  /**
   * Send an email
   * @param {string} username
   * @param {string} template
   * @param {object} body
   * @param {string} email
   * @param {string} subject
   * @returns {Promise<any>}
   */
  async send(username, template, body, email, subject, attachments, emailFooter = '__emailFooter') {
    console.count('email-send');
    const name = email.split('@')[0] || username;
    let msgFooter = undefined;
    let msg = undefined;

    try {
      if (template) {
        const { whiteLogo, primaryColor } = await this.getAssetsEmailNotification(body.creator);
        body = { whiteLogo, primaryColor, ...body };

        msg = Fs.readFileSync(Path.resolve(__dirname, `../templates/${template}.hbs`), 'utf8');
        msgFooter = Fs.readFileSync(Path.resolve(__dirname, `../templates/partials/${emailFooter}.hbs`), 'utf8');

        const footer = new RegExp(
          emailFooter !== '__emailFooter' ? `{{emailFooterWithoutSign}}` : `{{emailFooter}}`,
          'g'
        );
        msg = msg.replace(footer, msgFooter);

        const keys = Object.keys(body);
        for (const key of keys) {
          const re = new RegExp(`{{${key}}}`, 'g');
          msg = msg.replace(re, body[key]);
        }
      }

      await mailer
        .sendMail({
          from,
          to: email,
          subject,
          text: `cuac - ${subject}.`,
          html: msg || body || `<b>Hola ${name}</b> <p>Saludos desde cuac</p>`,
          attachments: undefined || attachments
        })
        .catch(async (error) => {
          console.error('emailService.send err', error);
          const { eventsService } = this.server.services();
          await eventsService.create({
            type: 'email',
            level: 'error',
            message: `emailService.send err ${error}`,
            system: 'hapi',
            date: new Date()
          });
        });
    } catch (error) {
      throw internal('Error en EmailService.send', error);
    }
  }

  async sendVerificationEmail({ to, verificationLink, type }) {
    try {
      const subject = type === 'signup' ? 'Verifica tu cuenta de CUAC' : 'Invitación para unirte a CUAC';

      const body = {
        verificationLink,
        buttonText: type === 'signup' ? 'Verificar cuenta' : 'Activar cuenta',
        title: type === 'signup' ? '¡Bienvenido a CUAC!' : 'Has sido invitado a unirte a CUAC',
        message:
          type === 'signup'
            ? 'Para comenzar a usar CUAC, por favor verifica tu cuenta haciendo clic en el siguiente botón:'
            : 'Has sido invitado a unirte a CUAC. Por favor activa tu cuenta haciendo clic en el siguiente botón:'
      };

      // Usamos el método send que ya tienes implementado
      await this.send(
        to.split('@')[0], // username del email
        'verify-email', // nombre del template
        body,
        to, // email destino
        subject
      );
    } catch (error) {
      throw internal('Error sending verification email', error);
    }
  }

  async getAssetsEmailNotification(creator) {
    const whiteLogo =
      creator === null || creator === undefined
        ? `https://` + Config.get('/HOST') + `/v3/assets/logo.light.png`
        : `https://` + Config.get('/HOST') + `/v3/users/${creator}/assets/logo.light.png`;
    let primaryColor;
    let statusCode = 404;
    let payload;

    if (creator === null || creator === undefined) {
      ({ statusCode, payload } = await this.server.inject({
        method: 'GET',
        url: `/assets/color.primary.txt`
      }));
    } else {
      ({ statusCode, payload } = await this.server.inject({
        method: 'GET',
        url: `/users/${creator}/assets/color.primary.txt`
      }));
    }

    statusCode === 404 ? (primaryColor = '#6344ff') : (primaryColor = payload);

    return { whiteLogo, primaryColor };
  }
};
