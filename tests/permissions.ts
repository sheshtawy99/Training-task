import { Core } from '@strapi/strapi';
interface PermissionGrant {
  controller: string;
  action: string;
  enabled: boolean;
}

/**
 * Grant permissions for specific endpoints during tests
 * This modifies the up_permissions table to allow access
 */
export async function grantTestPermissions(
  strapi: Core.Strapi,
  grants: PermissionGrant[]
) {
  const db = strapi.db.connection;
  
  try {
    // Get the public and authenticated role IDs
    const roles = await db('up_roles')
      .whereIn('type', ['public', 'authenticated'])
      .select('id', 'type');
    
    const roleMap = roles.reduce((acc, role) => {
      acc[role.type] = role.id;
      return acc;
    }, {} as Record<string, number>);
    
    // Process each grant
    for (const grant of grants) {
      // Update permissions for both public and authenticated roles
      for (const roleType of ['public', 'authenticated']) {
        const roleId = roleMap[roleType];
        if (!roleId) continue;
        
        // Check if permission exists
        const existingPermission = await db('up_permissions')
          .where({
            action: `api::${grant.controller}.${grant.controller}.${grant.action}`
          })
          .first();
        
        if (existingPermission) {
          // Check if this permission is linked to this role
          const linkExists = await db('up_permissions_role_lnk')
            .where({
              permission_id: existingPermission.id,
              role_id: roleId
            })
            .first();
          
          if (!linkExists && grant.enabled) {
            // Create the link
            await db('up_permissions_role_lnk')
              .insert({
                permission_id: existingPermission.id,
                role_id: roleId
              });
          } else if (linkExists && !grant.enabled) {
            // Remove the link
            await db('up_permissions_role_lnk')
              .where({
                permission_id: existingPermission.id,
                role_id: roleId
              })
              .del();
          }
        } else if (grant.enabled) {
          // Create new permission
          const [permission] = await db('up_permissions')
            .insert({
              action: `api::${grant.controller}.${grant.controller}.${grant.action}`,
              document_id: `perm-${grant.controller}-${grant.action}-${Date.now()}`,
              created_at: new Date(),
              updated_at: new Date()
            })
            .returning('*');
          
          // Link to role
          await db('up_permissions_role_lnk')
            .insert({
              permission_id: permission.id,
              role_id: roleId
            });
        }
      }
    }
    
  } catch (error) {
    throw error;
  }
}

/**
 * Grant all permissions for a specific controller
 */
export async function grantControllerPermissions(
  strapi: Core.Strapi,
  controller: string,
  actions: string[] = ['find', 'findOne', 'create', 'update', 'delete']
) {
  const grants = actions.map(action => ({
    controller,
    action,
    enabled: true
  }));
  
  return grantTestPermissions(strapi, grants);
}

export async function createTestUser(
  strapi: Core.Strapi,
  userData: Partial<{
    username: string;
    email: string;
    password: string;
    [key: string]: any;
  }>
) {
  try {
    const usersPermissionsPlugin = strapi.plugin('users-permissions');
    if (!usersPermissionsPlugin) {
      throw new Error('Users-permissions plugin not found');
    }
    
    const userService = usersPermissionsPlugin.service('user');
    const jwtService = usersPermissionsPlugin.service('jwt');
    
    // Get the authenticated role
    const authenticatedRole = await strapi.db.query('plugin::users-permissions.role').findOne({
      where: { type: 'authenticated' }
    });
    
    if (!authenticatedRole) {
      throw new Error('Authenticated role not found');
    }
    
    const timestamp = Date.now();
    const defaultData = {
      username: `test_${timestamp}`,
      email: `test_${timestamp}@journey.com`,
      password: 'TestPass123!',
      provider: 'local',
      confirmed: true,
      blocked: false,
      role: authenticatedRole.id
    };
    
    const fullUserData = {
      ...defaultData,
      ...userData
    };
    
    // Create the user using Strapi's user service
    const user = await userService.add(fullUserData);
    
    // Generate JWT token
    const jwt = jwtService.issue({ id: user.id });
    
    return {
      user,
      jwt,
      authHeader: `Bearer ${jwt}`
    };
  } catch (error) {
    console.error('Error creating test user:', error);
    throw error;
  }
}

// Grant Users & Permissions -> user controller (find, findOne, me) to public & authenticated
export async function createUserRequiredPermissions(strapi: Core.Strapi) {
  const db = strapi.db.connection; // Knex instance

  // Resolve link table name (v5 default is up_permissions_role_links)
  const linkTable =
    (await db.schema.hasTable('up_permissions_role_links'))
      ? 'up_permissions_role_links'
      : (await db.schema.hasTable('up_permissions_role_lnk'))
        ? 'up_permissions_role_lnk'
        : null;

  if (!linkTable) {
    throw new Error('Could not find permissions↔role link table');
  }

  // 1) Fetch role ids for public & authenticated
  const roles = await db('up_roles')
    .whereIn('type', ['public', 'authenticated'])
    .select('id', 'type');

  const roleMap = roles.reduce((acc, r) => { acc[r.type] = r.id; return acc; }, {} as Record<string, number>);

  // 2) Define the plugin actions we want to ensure exist & are linked
  const actions = ['find', 'findOne', 'me'].map(action => ({
    action: `plugin::users-permissions.user.${action}`,
  }));

  // 3) Ensure each permission row exists, then link it to both roles
  for (const { action } of actions) {
    // Check/create permission
    let perm = await db('up_permissions').where({ action }).first();

    if (!perm) {
      const [created] = await db('up_permissions')
        .insert({
          action,
          // document_id helps when the project uses Document Service; any unique string is fine
          document_id: `perm-users-permissions-user-${action}-${Date.now()}`,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning('*');
      perm = created;
    }

    // Link to roles (public + authenticated)
    for (const roleType of ['public', 'authenticated'] as const) {
      const roleId = roleMap[roleType];
      if (!roleId) continue;

      const exists = await db(linkTable)
        .where({ permission_id: perm.id, role_id: roleId })
        .first();

      if (!exists) {
        await db(linkTable).insert({ permission_id: perm.id, role_id: roleId });
      }
    }
  }
}