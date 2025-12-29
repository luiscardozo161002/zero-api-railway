'use strict';

const Joi = require('joi');

const HTTP_400 = Joi.object({
  statusCode: Joi.number().example(400),
  error: Joi.string().example('Bad request'),
  message: Joi.string().example('Bad request'),
  validation: Joi.object()
})
  .options({ stripUnknown: true })
  .label('BadRequest').description(`### Bad Request
  Request was rejected because it was malformed.
  #### Possible reasons include:
  - Missing required payload
  - Missing required parameters
  - Missing required headers
  - Missing required query parameters
  - Unexpected payload, parameters, headers, or query parameters`);

const HTTP_401 = Joi.object({
  statusCode: Joi.number().example(401),
  error: Joi.string().example('Unauthorized'),
  message: Joi.string().example('Unauthorized'),
  validation: Joi.object()
})
  .options({ stripUnknown: true })
  .label('Unauthorized').description(`### Unauthorized
  Request was rejected because it did not contain valid authentication credentials.
  #### Possible reasons include:
  - Missing required Basic authentication header
  - Missing required Bearer authentication header
  - Invalid authentication credentials
  - Expired authentication credentials
  - Revoked authentication credentials
  - Disabled authentication credentials
  
  #### If you are using Basic authentication
  - Ensure user account exists in this environment
  - Ensure that the username and password are correct
  - Keep in mind that user accounts are tied to their respective environment
  - Keep in mind that Basic authentication is case-sensitive
  
  #### If you are using Bearer authentication
  - Ensure that the token is valid
  - Ensure that the token was issued by this environment
  - Ensure that the token is not expired
  - Keep in mind that tokens are tied to their respective environment`);

const HTTP_402 = Joi.object({
  statusCode: Joi.number().example(403),
  error: Joi.string().example('Payment Required'),
  message: Joi.string().example('Payment Required'),
  validation: Joi.object()
})
  .options({ stripUnknown: true })
  .label('PaymentRequired').description(`### Payment Required
  Request was rejected because relevant account has an outstanding balance.
  #### To fix this
  - Additional credits need to be purchased
  - If required, please consider opening a billing ticket to request a credit limit increase`);

const HTTP_403 = Joi.object({
  statusCode: Joi.number().example(403),
  error: Joi.string().example('Forbidden'),
  message: Joi.string().example('Forbidden'),
  validation: Joi.object()
})
  .options({ stripUnknown: true })
  .label('Forbidden').description(`### Forbidden
  Request contained known credentials, however it was rejected because provided credentials do not have sufficient permissions to access the requested resource.
  #### Possible reasons include:
  - User does not have sufficient permissions to access the requested resource`);

const HTTP_404 = Joi.object({
  statusCode: Joi.number().example(404),
  error: Joi.string().example('Not found'),
  message: Joi.string().example('Not found'),
  validation: Joi.object()
})
  .options({ stripUnknown: true })
  .label('NotFound').description(`### Not found
  Request was rejected because the requested resource does not exist.
  #### Possible reasons include:
  - Requested resource does not exist
  - Default resource is being used instead of a custom resource`);

const HTTP_409 = Joi.object({
  statusCode: Joi.number().example(409),
  error: Joi.string().example('Conflict'),
  message: Joi.string().example('Conflict'),
  validation: Joi.object()
})
  .options({ stripUnknown: true })
  .label('Conflict');

const HTTP_410 = Joi.object({
  statusCode: Joi.number().example(410),
  error: Joi.string().example('Gone'),
  message: Joi.string().example('Gone'),
  validation: Joi.object()
})
  .options({ stripUnknown: true })
  .label('Gone').description(`### Gone
  Request was rejected because the requested resource is no longer available.
  #### Possible reasons include:
  - Owner of the resource deleted the resource
  - Staff member deleted the resource on behalf of the owner`);

const HTTP_413 = Joi.object({
  statusCode: Joi.number().example(413),
  error: Joi.string().example('Request entity too large'),
  message: Joi.string().example('Request entity too large'),
  validation: Joi.object()
})
  .options({ stripUnknown: true })
  .label('RequestEntityTooLarge').description(`### Request entity too large
  Request was rejected because the payload was too large.
  #### What to do to fix this:
  - Reduce the size of the payload
  - Separate the payload into multiple requests`);

const HTTP_415 = Joi.object({
  statusCode: Joi.number().example(415),
  error: Joi.string().example('Unsupported media type'),
  message: Joi.string().example('Unsupported media type'),
  validation: Joi.object()
})
  .options({ stripUnknown: true })
  .label('UnsupportedMediaType').description(`### Unsupported media type
  Request was rejected because the payload was in an unsupported format.
  #### This is most likely caused by:
  - Payload is not in PDF format
  - Payload is not in JSON format
  - Payload is not in CSV format
  #### What to do to fix this:
  - Ensure that the payload is in a supported format for this specific endpoint
  - Ensure that the payload is not corrupted
  - Ensure that the payload is not compressed`);

const HTTP_429 = Joi.object({
  statusCode: Joi.number().example(429),
  error: Joi.string().example('Too many requests'),
  message: Joi.string().example('Too many requests'),
  validation: Joi.object()
})
  .options({ stripUnknown: true })
  .label('TooManyRequests').description(`### Too many requests
  Request was rejected because the client has sent too many requests in a given amount of time.
  #### What to do to fix this:
  - Reduce the number of requests
  - Reduce the frequency of requests
  - Implement exponential backoff
  - Consider opening a support ticket to request a rate limit increase`);

const HTTP_500 = Joi.object({
  statusCode: Joi.number().example(500),
  error: Joi.string().example('Internal server error'),
  message: Joi.string().example('Internal server error'),
  validation: Joi.object()
})
  .options({ stripUnknown: true })
  .label('InternalServerError').description(`### Internal server error
  Server was not able to process the request due to an unexpected condition.
  #### Please consider creating a support ticket to report this issue
  - Provide as much information as possible
  - Include the resource ID
  - Include steps to reproduce the issue`);

const most_of_the_time_50X = `#### Most of the time, this should be a temporary issue and automatically resolve itself
- Please try again in a few minutes
- If the issue persists, please consider creating a support ticket to report this issue
  - Provide as much information as possible
  - Include the resource ID
  - Include steps to reproduce the issue`;

const HTTP_502 = Joi.object({
  statusCode: Joi.number().example(502),
  error: Joi.string().example('Bad Gateway'),
  message: Joi.string().example('Bad Gateway'),
  validation: Joi.object()
})
  .options({ stripUnknown: true })
  .label('BadGateway')
  .description(
    `### Bad Gateway
  Server was not able to process the request because it received an invalid response from an upstream server.` +
      most_of_the_time_50X
  );

const HTTP_503 = Joi.object({
  statusCode: Joi.number().example(503),
  error: Joi.string().example('Service Unavailable'),
  message: Joi.string().example('Service Unavailable'),
  validation: Joi.object()
})
  .options({ stripUnknown: true })
  .label('ServiceUnavailable')
  .description(
    `### Service Unavailable
  Server is currently not available to handle the request due to scheduled maintenance or a temporary rollout process.` +
      most_of_the_time_50X
  );

const HTTP_504 = Joi.object({
  statusCode: Joi.number().example(504),
  error: Joi.string().example('Gateway Timeout'),
  message: Joi.string().example('Gateway Timeout'),
  validation: Joi.object()
})
  .options({ stripUnknown: true })
  .label('GatewayTimeout')
  .description(
    `### Gateway Timeout
  Server was not able to process the request because it did not receive a response from an upstream server (e.g. an external provider or a server on a different region)` +
      most_of_the_time_50X
  );

module.exports = {
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
};
