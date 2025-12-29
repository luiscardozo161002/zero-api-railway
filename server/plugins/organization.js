'use strict';

const { badRequest, unauthorized, forbidden } = require('@hapi/boom');

module.exports = {
  name: 'organization',
  
  register(server, options = {}) {
    // Plugin settings
    const settings = {
      excludePaths: options.excludePaths || ['/auth', '/health', '/documentation', '/zeroclm-api'],
      allowNoOrg: options.allowNoOrg || false,
      autoDetect: options.autoDetect !== false // Default to true
    };

    // Register organization validation middleware
    server.ext('onPreAuth', async (request, h) => {
      // Skip excluded paths
      if (settings.excludePaths.some(path => request.path.startsWith(path))) {
        return h.continue;
      }

      // Get services
      const { organizationsService } = server.services();
      
      // Skip if no organization service
      if (!organizationsService) {
        request.log(['warning'], 'Organization middleware: organizationsService not available');
        return h.continue;
      }

      try {
        let organization = null;
        let organizationId = null;

        // 1. Check for organization in JWT token
        if (request.auth.credentials && request.auth.credentials.organization_id) {
          organizationId = request.auth.credentials.organization_id;
          
          // If we have organizationId from JWT, we can skip subdomain check
          organization = await organizationsService.findById(organizationId);
        }
        // 2. Auto-detect from subdomain if enabled
        else if (settings.autoDetect) {
          const host = request.headers.host || '';
          
          // Extract subdomain from hostname (e.g., tenant.example.com -> tenant)
          const domainParts = host.split('.');
          
          // Only process if we have what looks like a subdomain
          if (domainParts.length > 1) {
            const subdomain = domainParts[0];
            
            // Skip 'www' and other common subdomains
            if (!['www', 'api', 'app', 'dev'].includes(subdomain)) {
              try {
                organization = await organizationsService.findBySubdomain(subdomain);
                organizationId = organization.id;
              } catch (error) {
                // If subdomain not found, only fail if allowNoOrg is false
                if (!settings.allowNoOrg) {
                  throw badRequest(`Invalid organization subdomain: ${subdomain}`);
                }
              }
            }
          }
        }

        // If an organization is required but not found
        if (!organization && !settings.allowNoOrg) {
          throw unauthorized('Organization not identified');
        }

        // If organization found but inactive
        if (organization && !organization.is_active) {
          throw forbidden('Organization is inactive');
        }

        // Add organization data to auth credentials
        if (!request.auth.credentials) {
          request.auth.credentials = {};
        }

        if (organization) {
          // Set organization data in credentials
          request.auth.credentials.organization_id = organization.id;
          request.auth.credentials.organization = {
            id: organization.id,
            name: organization.name,
            subdomain: organization.subdomain
          };
        }

        return h.continue;
      } catch (error) {
        request.log(['error'], `Organization middleware error: ${error.message}`);
        throw error;
      }
    });

    // Expose helper function to get organization from request
    server.decorate('request', 'getOrganization', function() {
      return this.auth.credentials && this.auth.credentials.organization;
    });

    server.decorate('request', 'getOrganizationId', function() {
      return this.auth.credentials && this.auth.credentials.organization_id;
    });

    // Log plugin initialization
    server.log(['info', 'plugin'], 'Organization middleware initialized');
  }
};