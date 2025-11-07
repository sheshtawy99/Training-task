const fs = require('fs');
const { createStrapi } = require('@strapi/strapi');

// ============================================
// STRAPI INSTANCE MANAGEMENT
// ============================================
async function setupStrapi() {
  if (!global.strapi) {
    // 1. Create and load Strapi
    const strapi = await createStrapi({ distDir: './dist' }).load();

    // 2. Mount routes - CRITICAL for route testing
    strapi.server.mount();

    // 3. Store for use in tests
    global.strapi = strapi;

    // 4. Start Strapi
    await strapi.start();
  }
}

async function cleanupStrapi() {
  if (!global.strapi) {
    return;
  }

  const dbSettings = global.strapi.config.get('database.connection');

  await global.strapi.server.httpServer.close();
  await global.strapi.db.connection.destroy();

  if (typeof global.strapi.destroy === 'function') {
    await global.strapi.destroy();
  }

  // Clean up SQLite test database file if it exists
  if (dbSettings?.connection?.filename) {
    const tmpDbFile = dbSettings.connection.filename;
    if (fs.existsSync(tmpDbFile)) {
      fs.unlinkSync(tmpDbFile);
    }
  }

  global.strapi = null;
}

module.exports = { setupStrapi, cleanupStrapi };
