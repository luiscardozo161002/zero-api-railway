'use strict';

const Schmervice = require('@hapipal/schmervice');
const {
  internal,
  badRequest,
  notFound,
  resourceGone,
  isBoom,
  conflict,
  tooManyRequests,
  forbidden
} = require('@hapi/boom');

const fiveMinutes = 300000;

module.exports = class UsersService extends Schmervice.Service {
  constructor(...args) {
    super(...args);
  }

  async findAll(query = {}, showDeleted = false, organizationId = null) {
    const { User } = this.server.models();
    const { page = 1, limit = 20, ...filters } = query;

    try {
      const baseQuery = User.query();

      // Apply organization filter - multi-tenant security
      if (organizationId) {
        baseQuery.modify('byOrganization', organizationId);
      }

      if (!showDeleted) {
        baseQuery.whereNull('deleted_at');
      }

      // Apply filters if provided
      Object.entries(filters).forEach(([key, value]) => {
        if (['email', 'full_name', 'phone', 'area', 'username'].includes(key) && value) {
          baseQuery.where(key, 'like', `%${value}%`);
        } else if (['role_id', 'area_id', 'company', 'department'].includes(key) && value) {
          baseQuery.where(key, value);
        }
      });

      // Pagination
      const total = await baseQuery.clone().resultSize();
      const results = await baseQuery
        .limit(limit)
        .offset((page - 1) * limit)
        .orderBy('created_at', 'desc');

      return {
        data: results,
        meta: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / limit)
        }
      };
    } catch (ex) {
      if (!isBoom(ex)) {
        throw internal('Error getting users', ex);
      }

      throw ex;
    }
  }

  async findOne(id, showDeleted = false, organizationId = null) {
    const { User } = this.server.models();

    try {
      const query = User.query();

      if (id) {
        query.findOne({ id });
      }

      // Apply organization filter - multi-tenant security
      if (organizationId) {
        query.modify('byOrganization', organizationId);
      }

      // Add organization and organization log in response
      query.withGraphFetched('organization.logo');

      const user = await query;

      if (!user) {
        throw notFound(`User with ID ${id} not found`);
      }

      if (!showDeleted && user.deleted_at) {
        throw resourceGone(`User with ID ${id} is gone`);
      }

      return user;
    } catch (ex) {
      if (!isBoom(ex)) {
        throw internal(`Error getting user: ${id}`, ex);
      }

      throw ex;
    }
  }

  async findByUsername(username, showDeleted = false, organizationId = null) {
    const { User } = this.server.models();

    try {
      const query = User.query().where('username', username);

      // Apply organization filter if provided
      if (organizationId) {
        query.modify('byOrganization', organizationId);
      }

      // Filter deleted users
      if (!showDeleted) {
        query.whereNull('deleted_at');
      }

      const user = await query.first();

      if (!user) {
        throw notFound(`User with username ${username} not found`);
      }

      return user;
    } catch (ex) {
      if (!isBoom(ex)) {
        throw internal(`Error getting user by username: ${username}`, ex);
      }

      throw ex;
    }
  }

  async findOneByEmail(email, showDeleted = false, organizationId = null) {
    const { User } = this.server.models();

    try {
      const query = User.query().where({ email });

      // Apply organization filter - multi-tenant security
      if (organizationId) {
        query.modify('byOrganization', organizationId);
      }

      const user = await query.first();

      if (!user) {
        throw notFound(`User with email ${email} not found`);
      }

      if (!showDeleted && user.deleted_at) {
        throw resourceGone(`User with email ${email} is gone`);
      }

      return user;
    } catch (ex) {
      if (!isBoom(ex)) {
        throw internal(`Error finding user by email: ${email}`, ex);
      }

      throw ex;
    }
  }

  async findByFilters(filters = {}, options = {}) {
    const { User } = this.server.models();
    const { page = 1, limit = 20, showDeleted = false, organizationId = null } = options;

    try {
      let query = User.query();

      // Apply organization filter - multi-tenant security
      if (organizationId) {
        query.modify('byOrganization', organizationId);
      }

      // Apply filters
      if (filters.company) {
        query = query.where('company', filters.company);
      }

      if (filters.department) {
        query = query.where('department', filters.department);
      }

      if (filters.email) {
        query = query.where('email', 'like', `%${filters.email}%`);
      }

      if (filters.role_id) {
        query = query.where('role_id', filters.role_id);
      }

      // Filter deleted users
      if (!showDeleted) {
        query = query.whereNull('deleted_at');
      }

      // Add pagination
      const result = await query.page(page - 1, limit).orderBy('created_at', 'desc');

      return {
        data: result.results,
        pagination: {
          page,
          limit,
          total: result.total
        }
      };
    } catch (error) {
      throw internal('Error fetching users', error);
    }
  }

  async getCompanies(organizationId = null) {
    const { User } = this.server.models();

    try {
      const query = User.query().select('company').whereNotNull('company').groupBy('company').orderBy('company');

      // Apply organization filter if provided
      if (organizationId) {
        query.modify('byOrganization', organizationId);
      }

      const companies = await query;

      return companies.map((item) => item.company);
    } catch (error) {
      throw internal('Error fetching companies', error);
    }
  }

  async getDepartmentsByCompany(company, organizationId = null) {
    const { User } = this.server.models();

    try {
      const query = User.query()
        .select('department')
        .where('company', company)
        .whereNotNull('department')
        .groupBy('department')
        .orderBy('department');

      // Apply organization filter if provided
      if (organizationId) {
        query.modify('byOrganization', organizationId);
      }

      const departments = await query;

      return departments.map((item) => item.department);
    } catch (error) {
      throw internal('Error fetching departments', error);
    }
  }

  async verifyUsernames(usernames, organizationId = null) {
    const { User } = this.server.models();

    try {
      // First, normalize the usernames (make them unique and remove empty values)
      const uniqueUsernames = [...new Set(usernames.filter((username) => username))];

      if (uniqueUsernames.length === 0) {
        return [];
      }

      // Find existing usernames within the organization
      const query = User.query().select('username').whereIn('username', uniqueUsernames);

      // Apply organization filter if provided
      if (organizationId) {
        query.modify('byOrganization', organizationId);
      }

      const existingUsers = await query;

      const existingUsernames = existingUsers.map((user) => user.username);

      // Return usernames that don't exist
      return uniqueUsernames.filter((username) => !existingUsernames.includes(username));
    } catch (error) {
      throw internal('Error verifying usernames', error);
    }
  }

  async create({ email, password, typeInvite, id, organization_id, ...user }, transaction = null) {
    const { User } = this.server.models();
    const { cryptoService, verificationsService } = this.server.services();

    if (!organization_id) {
      throw badRequest('Organization ID is required');
    }

    const trx = transaction || (await User.startTransaction());

    try {
      // Check if user exists by email within the same organization
      const existsByEmail = await User.query(trx)
        .where('email', email)
        .where('organization_id', organization_id)
        .first();

      if (existsByEmail) {
        throw badRequest('Email already registered in this organization');
      }

      // If ID is provided, verify it doesn't exist
      if (id) {
        const existsById = await User.query(trx).findById(id);
        if (existsById) {
          throw badRequest(`User with ID ${id} already exists`);
        }
      }

      const password_hash = await cryptoService.bcrypt(password);
      const userData = {
        ...user,
        email,
        password_hash,
        organization_id
      };

      // Add ID only if provided
      if (id) {
        userData.id = id;
      }

      const createdUser = await User.query(trx).insert(userData);

      // Create verification request if service exists
      if (verificationsService) {
        try {
          await verificationsService.createVerification(email, typeInvite ? 'ADMIN_INVITE' : 'SIGNUP', trx);
        } catch (verificationError) {
          console.error('Error creating verification:', verificationError);
          // Continue even if verification fails
        }
      }

      if (!transaction) {
        await trx.commit();
      }

      return createdUser;
    } catch (error) {
      if (!transaction) {
        await trx.rollback();
      }

      throw error;
    }
  }

  async createMany(users, organizationId = null) {
    const { User } = this.server.models();
    const { cryptoService } = this.server.services();

    const transaction = await User.startTransaction();

    try {
      const results = [];

      for (const userData of users) {
        const { email, password, ...user } = userData;

        // Ensure organization_id is set
        const userOrganizationId = user.organization_id || organizationId;

        if (!userOrganizationId) {
          results.push({
            success: false,
            email,
            error: 'Organization ID is required'
          });
          continue;
        }

        // Check if user exists in the organization
        const existsQuery = User.query(transaction).where('email', email);

        if (userOrganizationId) {
          existsQuery.where('organization_id', userOrganizationId);
        }

        const exists = await existsQuery.first();

        if (exists) {
          // Skip this user and continue with others
          results.push({
            success: false,
            email,
            error: 'Email already registered in this organization'
          });
          continue;
        }

        const password_hash = await cryptoService.bcrypt(password);
        const createdUser = await User.query(transaction).insert({
          ...user,
          email,
          password_hash,
          organization_id: userOrganizationId
        });

        results.push({
          success: true,
          id: createdUser.id,
          email: createdUser.email
        });
      }

      await transaction.commit();
      return results;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async update(id, { email, password, ...userData }, organizationId = null) {
    const { User } = this.server.models();
    const { cryptoService, authService } = this.server.services();

    // Check if user exists in the specified organization
    await this.findOne(id, false, organizationId);

    // If updating email, check if it's available
    if (email && authService && typeof authService.isAvailableUserEmail === 'function') {
      if (!(await authService.isAvailableUserEmail({ email, id, organizationId }))) {
        throw badRequest(`Email ${email} is already in use`);
      }
    }

    try {
      const updateData = {
        ...userData,
        updated_at: new Date()
      };

      if (email) {
        updateData.email = email;
      }

      if (password) {
        updateData.password_hash = await cryptoService.bcrypt(password);
      }

      const query = User.query().where({ id });

      // Apply organization filter if provided
      if (organizationId) {
        query.where('organization_id', organizationId);
      }

      const [updatedUser] = await query.patch(updateData).returning('*');

      if (!updatedUser) {
        throw notFound(`User with ID ${id} not found or does not belong to this organization`);
      }

      return updatedUser;
    } catch (ex) {
      throw isBoom(ex) ? ex : internal('Error updating user', ex);
    }
  }

  async patch({ id, email, password, organization_id, ...user }) {
    const { User } = this.server.models();
    const { cryptoService, authService } = this.server.services();

    // If updating email, check if it's available within the organization
    if (email && authService && typeof authService.isAvailableUserEmail === 'function') {
      if (!(await authService.isAvailableUserEmail({ email, id, organizationId: organization_id }))) {
        throw badRequest(`Email ${email} is already in use`);
      }
    }

    try {
      const query = User.query().where({ id });

      // Apply organization filter if provided
      if (organization_id) {
        query.where('organization_id', organization_id);
      }

      const [savedUser] = await query
        .patch({
          ...user,
          email,
          password_hash: password ? await cryptoService.bcrypt(password) : undefined,
          updated_at: new Date()
        })
        .skipUndefined()
        .returning('*');

      if (!savedUser) {
        throw notFound(`User with ID ${id} not found`);
      }

      return savedUser;
    } catch (ex) {
      throw isBoom(ex) ? ex : internal('Error updating user', ex);
    }
  }

  async patchMany(users, organizationId = null) {
    const { User } = this.server.models();

    const transaction = await User.startTransaction();

    try {
      const results = [];

      for (const userData of users) {
        const { username, ...user } = userData;

        if (!username) {
          results.push({
            success: false,
            error: 'Username is required'
          });
          continue;
        }

        // Build query to find the user
        const findQuery = User.query(transaction).where('username', username);

        // Apply organization filter if provided
        if (organizationId) {
          findQuery.modify('byOrganization', organizationId);
        }

        // Verify user exists
        const existingUser = await findQuery.first();

        if (!existingUser) {
          results.push({
            success: false,
            username,
            error: 'User not found or does not belong to this organization'
          });
          continue;
        }

        // Build update query
        const updateQuery = User.query(transaction).where('id', existingUser.id);

        // Apply organization filter again for safety
        if (organizationId) {
          updateQuery.where('organization_id', organizationId);
        }

        // Update user
        const [updatedUser] = await updateQuery
          .patch({
            ...user,
            updated_at: new Date()
          })
          .skipUndefined()
          .returning('*');

        if (updatedUser) {
          results.push({
            success: true,
            id: updatedUser.id,
            username
          });
        } else {
          results.push({
            success: false,
            username,
            error: 'Failed to update user'
          });
        }
      }

      await transaction.commit();
      return results;
    } catch (error) {
      await transaction.rollback();
      throw isBoom(error) ? error : internal('Error updating users', error);
    }
  }

  async updatePassword(id, password, organizationId = null) {
    const { User } = this.server.models();
    const { cryptoService } = this.server.services();

    try {
      // Build query
      const query = User.query();

      if (organizationId) {
        query.where('organization_id', organizationId);
      }

      const user = await query.findById(id);

      if (!user) {
        throw notFound(`User not found or does not belong to this organization`);
      }

      const password_hash = await cryptoService.bcrypt(password);

      // Build update query
      const updateQuery = User.query().where({ id });

      if (organizationId) {
        updateQuery.where('organization_id', organizationId);
      }

      await updateQuery.patch({
        password_hash,
        updated_at: new Date()
      });

      return { success: true };
    } catch (error) {
      if (!isBoom(error)) {
        throw internal('Error updating password', error);
      }

      throw error;
    }
  }

  async deactivate(id, organizationId = null) {
    const { User } = this.server.models();

    // Check if user exists in the specified organization
    await this.findOne(id, false, organizationId);

    try {
      const query = User.query().where({ id });

      // Apply organization filter if provided
      if (organizationId) {
        query.where('organization_id', organizationId);
      }

      const [deactivatedUser] = await query
        .patch({
          is_deleted: true,
          deleted_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');

      return deactivatedUser;
    } catch (ex) {
      throw internal(`Error deactivating user: ${id}`, ex);
    }
  }

  async delete(id, organizationId = null) {
    const { User } = this.server.models();

    // Check if user exists in the specified organization (including deleted ones)
    await this.findOne(id, true, organizationId);

    try {
      const query = User.query();

      // Apply organization filter if provided
      if (organizationId) {
        query.where('organization_id', organizationId);
      }

      await query.where('id', id).delete();
      return { success: true };
    } catch (ex) {
      throw internal(`Error deleting user: ${id}`, ex);
    }
  }

  // Create initial admin user for a new organization
  async createInitialAdmin(organizationId, userData = {}, transaction = null) {
    // Generate default admin if not provided
    const adminData = {
      email: userData.email || `admin@${organizationId}.zeroclm.io`,
      password: userData.password || 'changeme123', // Should be changed on first login
      full_name: userData.full_name || 'System Administrator',
      role_id: 1, // Assuming 1 is admin role
      organization_id: organizationId,
      is_active: true
    };

    // Create the admin user
    return await this.create(
      {
        ...adminData,
        typeInvite: true // Mark as admin invite
      },
      transaction
    );
  }

  async verifyEmail(token) {
    const { Verification, User } = this.server.models();

    const verification = await Verification.query()
      .where('verification_token', token)
      .where('confirmed_at', null)
      .where('expires_at', '>', new Date())
      .first();

    if (!verification) {
      throw badRequest('Invalid or expired verification token');
    }

    await verification.$query().patch({
      confirmed_at: new Date()
    });

    // If it was an admin invitation, update user status
    if (verification.verification_type === 'ADMIN_INVITE') {
      await User.query().where('id', verification.user_id).patch({ is_active: true });
    }

    return verification;
  }

  async verifyIfUserIsActive(id, organizationId = null) {
    console.log('📥 Received ID in verifyIfUserIsActive:', id);

    const { User, Verification } = this.server.models();

    try {
      const query = User.query().where({ id });

      // Apply organization filter if provided
      if (organizationId) {
        query.where('organization_id', organizationId);
      }

      const user = await query.first();

      if (!user) {
        console.log('❌ User not found for ID:', id);
        throw notFound(`User not found`);
      }

      if (!user.is_active || user.is_deleted) {
        throw badRequest('User account is not active');
      }

      const verification = await Verification.query()
        .where('user_id', id)
        .whereNotNull('confirmed_at')
        .orderBy('created_at', 'desc')
        .first();

      // Commented out as in the original code
      // if (!verification) {
      //   console.log('⚠️ No verification found for user:', id);
      //   throw forbidden(`Unverified account`);
      // }
    } catch (error) {
      console.error('💥 Error in verifyIfUserIsActive:', error);
      throw error;
    }
  }
};
