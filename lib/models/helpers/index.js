'use strict';

const Schwifty = require('@hapipal/schwifty');
const { DbErrors } = require('objection-db-errors');

exports.Model = class extends DbErrors(Schwifty.Model) {
  static createNotFoundError(ctx) {
    const error = super.createNotFoundError(ctx);

    return Object.assign(error, {
      modelName: this.name
    });
  }

  static field(name) {
    return this.joiSchema.$_reach([name]);
  }
};
