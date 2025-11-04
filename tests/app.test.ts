const { setupStrapi, cleanupStrapi } = require('./strapi');

/** this code is called once before any test is called */
beforeAll(async () => {
  await setupStrapi(); // Singleton so it can be called many times
});

/** this code is called once before all the tests are finished */
afterAll(async () => {
  await cleanupStrapi();
});

it('strapi is defined', () => {
  expect(strapi).toBeDefined();
});