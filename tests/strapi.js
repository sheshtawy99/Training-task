try {
  require('ts-node/register/transpile-only');
} catch (err) {
  try {
    require('@strapi/typescript-utils/register');
  } catch (strapiRegisterError) {
    require('./ts-runtime');
  }
}

const fs = require('fs');
const path = require('path');
const Module = require('module');
const ts = require('typescript');
const databaseConnection = require('@strapi/database/dist/connection.js');
const knexFactory = require('knex');
const strapiCoreRoot = path.dirname(require.resolve('@strapi/core/package.json'));
const loadConfigFilePath = path.join(strapiCoreRoot, 'dist', 'utils', 'load-config-file.js');
const loadConfigFileModule = require(loadConfigFilePath);
const { compilerOptions: baseCompilerOptions } = require('./ts-compiler-options');

// ============================================
// 1. PATCH: TypeScript Configuration Loader
// ============================================
if (!loadConfigFileModule.loadConfigFile.__tsRuntimePatched) {
  const strapiUtils = require('@strapi/utils');
  const originalLoadConfigFile = loadConfigFileModule.loadConfigFile;

  const loadTypeScriptConfig = (file) => {
    const source = fs.readFileSync(file, 'utf8');
    const options = {
      ...baseCompilerOptions,
      module: ts.ModuleKind.CommonJS,
    };

    const output = ts.transpileModule(source, {
      compilerOptions: options,
      fileName: file,
      reportDiagnostics: false,
    });

    const moduleInstance = new Module(file);
    moduleInstance.filename = file;
    moduleInstance.paths = Module._nodeModulePaths(path.dirname(file));
    moduleInstance._compile(output.outputText, file);

    const exported = moduleInstance.exports;
    const resolved = exported && exported.__esModule ? exported.default : exported;

    if (typeof resolved === 'function') {
      return resolved({ env: strapiUtils.env });
    }

    return resolved;
  };

  const patchedLoadConfigFile = (file) => {
    const extension = path.extname(file).toLowerCase();

    if (extension === '.ts' || extension === '.cts' || extension === '.mts') {
      return loadTypeScriptConfig(file);
    }

    return originalLoadConfigFile(file);
  };

  patchedLoadConfigFile.__tsRuntimePatched = true;
  loadConfigFileModule.loadConfigFile = patchedLoadConfigFile;
  require.cache[loadConfigFilePath].exports = loadConfigFileModule;
}

// ============================================
// 2. PATCH: Configuration Directory Scanner
// ============================================
const configLoaderPath = path.join(strapiCoreRoot, 'dist', 'configuration', 'config-loader.js');
const originalLoadConfigDir = require(configLoaderPath);
const validExtensions = ['.js', '.json', '.ts', '.cts', '.mts'];
const mistakenFilenames = {
  middleware: 'middlewares',
  plugin: 'plugins',
};
const restrictedFilenames = [
  'uuid',
  'hosting',
  'license',
  'enforce',
  'disable',
  'enable',
  'telemetry',
  'strapi',
  'internal',
  'launchedAt',
  'serveAdminPanel',
  'autoReload',
  'environment',
  'packageJsonStrapi',
  'info',
  'dirs',
  ...Object.keys(mistakenFilenames),
];
const strapiConfigFilenames = ['admin', 'server', 'api', 'database', 'middlewares', 'plugins', 'features'];

if (!originalLoadConfigDir.__tsRuntimePatched) {
  const patchedLoadConfigDir = (dir) => {
    if (!fs.existsSync(dir)) {
      return {};
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const seenFilenames = new Set();

    const configFiles = entries.reduce((acc, entry) => {
      if (!entry.isFile()) {
        return acc;
      }

      const extension = path.extname(entry.name);
      const extensionLower = extension.toLowerCase();
      const baseName = path.basename(entry.name, extension);
      const baseNameLower = baseName.toLowerCase();

      if (!validExtensions.includes(extensionLower)) {
        console.warn(`Config file not loaded, extension must be one of ${validExtensions.join(',')}): ${entry.name}`);
        return acc;
      }

      if (restrictedFilenames.includes(baseNameLower)) {
        console.warn(`Config file not loaded, restricted filename: ${entry.name}`);
        if (baseNameLower in mistakenFilenames) {
          console.log(`Did you mean ${mistakenFilenames[baseNameLower]}?`);
        }
        return acc;
      }

      const restrictedPrefix = [...restrictedFilenames, ...strapiConfigFilenames].find(
        (restrictedName) => restrictedName.startsWith(baseNameLower) && restrictedName !== baseNameLower
      );

      if (restrictedPrefix) {
        console.warn(`Config file not loaded, filename cannot start with ${restrictedPrefix}: ${entry.name}`);
        return acc;
      }

      if (seenFilenames.has(baseNameLower)) {
        console.warn(`Config file not loaded, case-insensitive name matches other config file: ${entry.name}`);
        return acc;
      }

      seenFilenames.add(baseNameLower);
      acc.push(entry);
      return acc;
    }, []);

    return configFiles.reduce((acc, entry) => {
      const extension = path.extname(entry.name);
      const key = path.basename(entry.name, extension);
      const filePath = path.resolve(dir, entry.name);

      acc[key] = loadConfigFileModule.loadConfigFile(filePath);
      return acc;
    }, {});
  };

  patchedLoadConfigDir.__tsRuntimePatched = true;
  require.cache[configLoaderPath].exports = patchedLoadConfigDir;
}
// ============================================
// 3. PATCH: Database Connection Handler
// ============================================
// This section normalizes database client names for testing.
// Maps Strapi's client names (sqlite, mysql, postgres) to actual driver names
// (sqlite3, mysql2, pg) and handles connection pooling.

databaseConnection.createConnection = (() => {
  const clientMap = {
    sqlite: 'sqlite3',
    mysql: 'mysql2',
    postgres: 'pg',
  };

  return (userConfig, strapiConfig) => {
    if (!clientMap[userConfig.client]) {
      throw new Error(`Unsupported database client ${userConfig.client}`);
    }

    const knexConfig = {
      ...userConfig,
      client: clientMap[userConfig.client],
    };

    if (strapiConfig?.pool?.afterCreate) {
      knexConfig.pool = knexConfig.pool || {};

      const userAfterCreate = knexConfig.pool?.afterCreate;
      const strapiAfterCreate = strapiConfig.pool.afterCreate;

      knexConfig.pool.afterCreate = (conn, done) => {
        strapiAfterCreate(conn, (err, nativeConn) => {
          if (err) {
            return done(err, nativeConn);
          }

          if (userAfterCreate) {
            return userAfterCreate(nativeConn, done);
          }

          return done(null, nativeConn);
        });
      };
    }

    return knexFactory(knexConfig);
  };
})();

// ============================================
// 4. TEST ENVIRONMENT SETUP
// ============================================
if (typeof jest !== 'undefined' && typeof jest.setTimeout === 'function') {
  jest.setTimeout(30000);
}

const { createStrapi } = require('@strapi/strapi');

const dotenv = require('dotenv');

const databaseClient = process.env.DATABASE_CLIENT || 'sqlite';
const clientMap = {
  sqlite: 'sqlite3',
  'better-sqlite3': 'sqlite3',
  mysql: 'mysql2',
  postgres: 'pg',
};

const driver = clientMap[databaseClient];

if (!driver) {
  throw new Error(`Unsupported database client "${databaseClient}".`);
}

if (databaseClient === 'better-sqlite3') {
  process.env.DATABASE_CLIENT = 'sqlite';
}

require(driver);

let instance;

// ============================================
// 5. STRAPI INSTANCE MANAGEMENT
// ============================================
async function setupStrapi() {
  if (!instance) {
    
    instance = await createStrapi().load();
    global.strapi = instance;
    console.log('Environment file loaded from ====>>>:',process.env.NODE_ENV) ;
    
    console.log('Strapi ======>>>>>>> ' , process.env.DATABASE_FILENAME);
    const dbSettings = strapi.config.get('database.connection');
    const tmpDbFile = dbSettings.connection.filename;
    console.log('Temporary database file for tests:', tmpDbFile);
    console.log('Database settings for tests:', dbSettings);
    // Patch the user service to automatically assign the authenticated role
    const userService = strapi.plugins['users-permissions']?.services?.user;
    if (userService) {
      const originalAdd = userService.add.bind(userService);

      userService.add = async (values) => {
        const data = { ...values };

        if (!data.role) {
          const defaultRole = await strapi.db
            .query('plugin::users-permissions.role')
            .findOne({ where: { type: 'authenticated' } });

          if (defaultRole) {
            data.role = defaultRole.id;
          }
        }

        return originalAdd(data);
      };
    }
  }
  return instance;
}

async function cleanupStrapi() {
  if (!global.strapi) return;

  const dbSettings = strapi.config.get('database.connection');

  await strapi.server.httpServer.close();
  await strapi.db.connection.destroy();

  if (typeof strapi.destroy === 'function') {
    await strapi.destroy();
  }

  if (dbSettings && dbSettings.connection && dbSettings.connection.filename) {
    const tmpDbFile = dbSettings.connection.filename;
    if (fs.existsSync(tmpDbFile)) {
      fs.unlinkSync(tmpDbFile);
    }
  }
}

module.exports = { setupStrapi, cleanupStrapi };
