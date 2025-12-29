'use strict';

const Schmervice = require('@hapipal/schmervice');
const { internal, badRequest, notFound, resourceGone, isBoom, conflict } = require('@hapi/boom');

module.exports = class OrganizationsService extends Schmervice.Service {
  constructor(...args) {
    super(...args);
  }

  async findAll({ filters = {}, pagination = {}, includeDeleted = false }) {
    const { Organization } = this.server.models();
    const { page = 1, limit = 25 } = pagination;

    try {
      const baseQuery = Organization.query();
      
      if (!includeDeleted) {
        baseQuery.modify('withoutDeleted');
      }
      
      // Apply filters if provided
      if (filters.name) {
        baseQuery.where('name', 'like', `%${filters.name}%`);
      }
      
      if (filters.subdomain) {
        baseQuery.where('subdomain', 'like', `%${filters.subdomain}%`);
      }
      
      if (filters.active !== undefined) {
        baseQuery.where('is_active', Boolean(filters.active));
      }
      
      // Get total count for pagination
      const total = await baseQuery.clone().resultSize();
      
      // Get paginated results
      const results = await baseQuery
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset((page - 1) * limit);
      
      return {
        results,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / limit),
          totalItems: total
        }
      };
    } catch (ex) {
      if (!isBoom(ex)) {
        throw internal('Error getting organizations', ex);
      }
      
      throw ex;
    }
  }

  async findById(id, includeDeleted = false) {
    const { Organization } = this.server.models();

    try {
      const query = Organization.query().findById(id);
      
      if (!includeDeleted) {
        query.modify('withoutDeleted');
      }
      
      const organization = await query;

      if (!organization) {
        throw notFound(`Organization with ID ${id} not found`);
      }

      if (!includeDeleted && organization.deleted_at) {
        throw resourceGone(`Organization with ID ${id} is gone`);
      }

      return organization;
    } catch (ex) {
      if (!isBoom(ex)) {
        throw internal(`Error getting organization with ID ${id}`, ex);
      }

      throw ex;
    }
  }

  async findBySubdomain(subdomain) {
    const { Organization } = this.server.models();

    try {
      const organization = await Organization.query()
        .modify('withoutDeleted')
        .modify('onlyActive')
        .modify('findBySubdomain', subdomain)
        .first();

      if (!organization) {
        throw notFound(`Organization with subdomain ${subdomain} not found`);
      }

      return organization;
    } catch (ex) {
      if (!isBoom(ex)) {
        throw internal(`Error finding organization by subdomain: ${subdomain}`, ex);
      }

      throw ex;
    }
  }

  async create(organizationData, transaction = null) {
    const { Organization } = this.server.models();
    const trx = transaction || await Organization.startTransaction();

    try {
      // Check for existing subdomain
      const existingSubdomain = await Organization.query(trx)
        .where('subdomain', organizationData.subdomain.toLowerCase())
        .first();
      
      if (existingSubdomain) {
        throw badRequest(`Subdomain '${organizationData.subdomain}' is already in use`);
      }
      
      // Create organization
      const organization = await Organization.query(trx).insert({
        ...organizationData,
        subdomain: organizationData.subdomain.toLowerCase()
      });
      
      if (!transaction) {
        await trx.commit();
      }
      
      return organization;
    } catch (error) {
      if (!transaction) {
        await trx.rollback();
      }
      
      throw error;
    }
  }

  async update(id, organizationData) {
    const { Organization } = this.server.models();
    
    // Check if organization exists
    await this.findById(id);
    
    // Check subdomain uniqueness if being updated
    if (organizationData.subdomain) {
      const existingSubdomain = await Organization.query()
        .where('subdomain', organizationData.subdomain.toLowerCase())
        .whereNot('id', id)
        .first();
      
      if (existingSubdomain) {
        throw badRequest(`Subdomain '${organizationData.subdomain}' is already in use`);
      }
      
      // Lowercase the subdomain
      organizationData.subdomain = organizationData.subdomain.toLowerCase();
    }
    
    try {
      const [updatedOrganization] = await Organization.query()
        .where({ id })
        .patch({
          ...organizationData,
          updated_at: new Date()
        })
        .returning('*');
        
      return updatedOrganization;
    } catch (ex) {
      throw internal(`Error updating organization: ${id}`, ex);
    }
  }
  
  async delete(id) {
    const { Organization } = this.server.models();
    
    // Check if organization exists
    await this.findById(id);
    
    try {
      const [deletedOrganization] = await Organization.query()
        .where({ id })
        .patch({
          deleted_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');
        
      return deletedOrganization;
    } catch (ex) {
      throw internal(`Error deleting organization: ${id}`, ex);
    }
  }
  
  async restore(id) {
    const { Organization } = this.server.models();
    
    // Check if organization exists (including deleted ones)
    await this.findById(id, true);
    
    try {
      const [restoredOrganization] = await Organization.query()
        .where({ id })
        .patch({
          deleted_at: null,
          updated_at: new Date()
        })
        .returning('*');
        
      return restoredOrganization;
    } catch (ex) {
      throw internal(`Error restoring organization: ${id}`, ex);
    }
  }
  
  async toggleActive(id, isActive) {
    const { Organization } = this.server.models();
    
    // Check if organization exists
    await this.findById(id);
    
    try {
      const [updatedOrganization] = await Organization.query()
        .where({ id })
        .patch({
          is_active: isActive,
          updated_at: new Date()
        })
        .returning('*');
        
      return updatedOrganization;
    } catch (ex) {
      throw internal(`Error toggling active status for organization: ${id}`, ex);
    }
  }
  
  async initializeOrganization(id) {
    const { Organization } = this.server.models();
    const { settingsService, usersService } = this.server.services();
    
    // Start transaction
    const trx = await Organization.startTransaction();
    
    try {
      // Check if organization exists
      const organization = await this.findById(id);
      
      // Initialize default settings
      await settingsService.createDefaultSettings(id, trx);
      
      // Add user admin if needed
      // This would depend on your implementation - simplified example:
      // const adminUser = await usersService.findAdminForOrganization(id, trx);
      // if (!adminUser) {
      //   // Create admin user logic
      // }
      
      await trx.commit();
      return organization;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }
  
  // Method for onboarding a new organization with all required setup
  async onboardOrganization(organizationData) {
    const { settingsService, usersService } = this.server.services();
    const { Organization } = this.server.models();
    
    const trx = await Organization.startTransaction();
    
    try {
      // 1. Create organization
      const organization = await this.create(organizationData, trx);
      
      // 2. Initialize settings with defaults
      await settingsService.createDefaultSettings(organization.id, trx);
      
      // 3. Create initial admin user
      if (organizationData.adminUser) {
        await usersService.create({
          ...organizationData.adminUser,
          organization_id: organization.id,
          role_id: 1 // Assuming 1 is admin role
        }, trx);
      }
      
      await trx.commit();
      return organization;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }
};