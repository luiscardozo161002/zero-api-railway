'use strict';

const Helpers = require('../helpers');
const Joi = require('joi');
const { publicSchema: User } = require('../../models/user');
const { badRequest, forbidden, internal } = require('@hapi/boom');

const notes = `Create a new user with required information`;

module.exports = Helpers.withDefaults({
  method: 'POST',
  path: '/users',
  options: {
    tags: ['api', 'users'],
    description: 'Create a new user',
    notes,
    plugins: { 'hapi-swagger': { security: [{ jwt: [] }] } },
    auth: {
      strategy: 'jwt',
      mode: 'optional',
    },
    //auth: false,
    response: {
      status: {
        201: Joi.object({
          statusCode: Joi.number().required().example(201),
          message: Joi.string().required().example('User created successfully'),
          data: User.options({ stripUnknown: true })
        }).label('Created'),
        400: Helpers.HTTP_400,
        403: Helpers.HTTP_403,
        500: Helpers.HTTP_500
      }
    },
    validate: {
      payload: User.append({
        //id: Joi.string().uuid().optional().example('123e4567-e89b-12d3-a456-426614174000'),
        email: Joi.string().email().required().example('user@example.com'),
        password: Joi.when('$auth.credentials.scope', {
          is: Joi.array().items(Joi.string().valid('admin')),
          then: Joi.string().optional(),
          otherwise: Joi.string().required()
        }).example('secure-password'),
        full_name: Joi.string().required().example('John Doe'),
        phone: Joi.string().optional().example('1234567890'),
        area: Joi.string().optional().example('Human Resources'),
        area_id: Joi.number().integer().optional().example(1),
        role_id: Joi.number().integer().optional().example(1),
        organization_id: Joi.number().integer().when('$auth.credentials.organization_id', {
          is: Joi.exist(),
          then: Joi.optional().default(Joi.ref('$auth.credentials.organization_id')),
          otherwise: Joi.required()
        }).example(1).description('Organization ID')
      })
        .options({ allowUnknown: false })
        .required()
    },
    handler: async (request, h) => {
      try {
        const {
          payload: user,
          auth: { credentials }
        } = request;

        const typeInvite = credentials?.scope?.includes('admin') || false;
        const { usersService } = request.services();
        
        // Ensure organization_id is set properly
        let organizationId = user.organization_id;
        
        // If authenticated and has an organization_id in credentials
        if (credentials && credentials.organization_id) {
          // Non-admin users can only create users in their own organization
          if (!credentials.scope || !credentials.scope.includes('admin')) {
            if (organizationId && organizationId !== credentials.organization_id) {
              throw forbidden('You can only create users in your own organization');
            }
            
            // Force the user to be in the same organization as the authenticated user
            organizationId = credentials.organization_id;
          }
        }
        
        // Set the organization_id in the user data
        const userData = {
          ...user,
          organization_id: organizationId,
          typeInvite
        };
        
        const createdUser = await usersService.create(userData);

        return h.response({
          statusCode: 201,
          message: 'User created successfully',
          data: createdUser
        }).code(201);
      } catch (error) {
        throw error.isBoom ? error : internal(error.message || 'An error occurred', error);
      }
    }
  }
});