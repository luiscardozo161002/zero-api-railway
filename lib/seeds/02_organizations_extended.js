'use strict';

/**
 * @param {import('knex').Knex} knex
 */
exports.seed = async (knex) => {
    const organizations = [
        { subdomain: 'qa', name: 'QA' },
        { subdomain: 'maver', name: 'Maver' },
        { subdomain: 'agroencymas', name: 'Agroencymas' },
        { subdomain: 'demo', name: 'Demo' },
        { subdomain: 'fplus', name: 'Fibra Plus' },
        { subdomain: 'fimpe', name: 'Fimpe' },
        { subdomain: 'mainlandfarm', name: 'Mainland Farms' },
        { subdomain: 'sblc', name: 'SBLC' },
        { subdomain: 'siigo', name: 'Siigo' },
        { subdomain: 'clegal', name: 'Contrato Legal' }
    ];

    console.log('🌱 Starting organizations seed...');

    for (const org of organizations) {
        const existingOrg = await knex('organizations').where('subdomain', org.subdomain).first();

        if (!existingOrg) {
            await knex('organizations').insert({
                name: org.name,
                subdomain: org.subdomain,
                is_active: true,
                created_at: new Date(),
                updated_at: new Date()
            });
            console.log(`✅ Organization created: ${org.name} (${org.subdomain})`);
        } else {
            console.log(`ℹ️ Organization already exists: ${org.name} (${org.subdomain})`);
        }
    }

    console.log('🏁 Organizations seed completed.');
};
