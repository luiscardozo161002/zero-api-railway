'use strict';

const Toys = require('@hapipal/toys');
const {
  HTTP_400,
  HTTP_401,
  HTTP_402,
  HTTP_403,
  HTTP_404,
  HTTP_409,
  HTTP_410,
  HTTP_413,
  HTTP_415,
  HTTP_429,
  HTTP_500,
  HTTP_502,
  HTTP_503,
  HTTP_504
} = require('./statusCodes');

exports.HTTP_400 = HTTP_400;

exports.HTTP_401 = HTTP_401;

exports.HTTP_402 = HTTP_402;

exports.HTTP_403 = HTTP_403;

exports.HTTP_404 = HTTP_404;

exports.HTTP_409 = HTTP_409;

exports.HTTP_410 = HTTP_410;

exports.HTTP_413 = HTTP_413;

exports.HTTP_415 = HTTP_415;

exports.HTTP_429 = HTTP_429;

exports.HTTP_500 = HTTP_500;

exports.HTTP_502 = HTTP_502;

exports.HTTP_503 = HTTP_503;

exports.HTTP_504 = HTTP_504;

exports.withDefaults = Toys.withRouteDefaults({
  options: {
    // CORS is ennabled at gateway level, so no point on doing it here.
    // cors: true,
    tags: ['api'],
    validate: {
      failAction: (request, h, err) => {
        throw err;
      }
    },
    log: {
      collect: true
    },
    response: {
      modify: true,
      options: {
        stripUnknown: true
      },
      failAction: (request, h, err) => {
        request.log(['implementation', 'response'], err);
        throw err;
      }
    }
  }
});
