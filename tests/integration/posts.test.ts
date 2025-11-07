import request from 'supertest';
import type { Core } from '@strapi/types';
import { createStrapi } from '@strapi/strapi';
import {grantControllerPermissions  , createUserRequiredPermissions , createTestUser }from '../permissions';
import { HTTP_STATUS } from '../constants/errors';
const { setupStrapi, cleanupStrapi } = require('../strapi');


declare global {
  // Make global Strapi type-safe
  var strapi: Core.Strapi;
}

beforeAll(async () => {
    await setupStrapi();
});


afterAll(async () => {
  await cleanupStrapi();
});

describe('Post Integration Tests', () => {

  describe('Post Creation', () => {
    it('should create a post successfully', async () => {
      // Ensure Strapi is running
      expect(strapi).toBeDefined();
      expect(strapi.server.httpServer).toBeDefined();

      await grantControllerPermissions(strapi, 'post');
      await createUserRequiredPermissions(strapi);
      const postcreator = await createTestUser(strapi, { username: "postCreator", email: "k@ex.com", password: "khaled" });

      // Perform the HTTP request through Strapi's internal Koa server
      const res = await request(strapi.server.httpServer)
        .post('/api/posts?populate=author')
        .set('Authorization', postcreator.authHeader)
        .send({
          data: { body: 'This is a post created during integration testing.' },
        })
        .expect(HTTP_STATUS.CREATED);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.body).toBe('This is a post created during integration testing.');
    });
  });

  describe('Delete Post Policy', () => {
    it('should allow post author to delete their own post', async () => {
      await grantControllerPermissions(strapi, 'post');
      await createUserRequiredPermissions(strapi);

      const author = await createTestUser(strapi, { username: "postAuthor1", email: "author1@ex.com", password: "password123" });

      // Create a post
      const createRes = await request(strapi.server.httpServer)
        .post('/api/posts?populate=author')
        .set('Authorization', author.authHeader)
        .send({ data: { body: 'Post to be deleted by author' } })
        .expect(HTTP_STATUS.CREATED);

      const postId = createRes.body.data.documentId;

      // Delete the post as the author
      await request(strapi.server.httpServer)
        .delete(`/api/posts/${postId}`)
        .set('Authorization', author.authHeader)
        .expect(HTTP_STATUS.NO_CONTENT);
    });

    it('should prevent non-author from deleting a post', async () => {
      await grantControllerPermissions(strapi, 'post');
      await createUserRequiredPermissions(strapi);

      const author = await createTestUser(strapi, { username: "postAuthor2", email: "author2@ex.com", password: "password123" });
      const nonAuthor = await createTestUser(strapi, { username: "nonAuthor1", email: "nonauthor1@ex.com", password: "password123" });

      // Create a post as author
      const createRes = await request(strapi.server.httpServer)
        .post('/api/posts?populate=author')
        .set('Authorization', author.authHeader)
        .send({ data: { body: 'Post owned by author' } })
        .expect(HTTP_STATUS.CREATED);

      const postId = createRes.body.data.documentId;

      // Try to delete the post as non-author
      const deleteRes = await request(strapi.server.httpServer)
        .delete(`/api/posts/${postId}`)
        .set('Authorization', nonAuthor.authHeader)
        .expect(HTTP_STATUS.FORBIDDEN);

      expect(deleteRes.body.error).toBeDefined();
    });

    it('should return error when deleting non-existent post', async () => {
      await grantControllerPermissions(strapi, 'post');
      await createUserRequiredPermissions(strapi);

      const user = await createTestUser(strapi, { username: "user1", email: "user1@ex.com", password: "password123" });

      // Try to delete a non-existent post
      const deleteRes = await request(strapi.server.httpServer)
        .delete('/api/posts/nonexistent-id-12345')
        .set('Authorization', user.authHeader)
        .expect(HTTP_STATUS.NOT_FOUND);

      expect(deleteRes.body.error).toBeDefined();
    });
  });

  describe('Attach Author Middleware - Posts', () => {
    it('should auto-attach authenticated user as author when creating post', async () => {
      await grantControllerPermissions(strapi, 'post');
      await createUserRequiredPermissions(strapi);

      const user = await createTestUser(strapi, { username: "postCreator2", email: "postcreator2@ex.com", password: "password123" });

      // Create a post without explicitly setting author
      const res = await request(strapi.server.httpServer)
        .post('/api/posts?populate=author')
        .set('Authorization', user.authHeader)
        .send({ data: { body: 'Post with auto-attached author' } })
        .expect(HTTP_STATUS.CREATED);

      // Verify author was automatically attached
      expect(res.body.data.author).toBeDefined();
      expect(res.body.data.author.documentId).toBe(user.user.documentId);
    });
  });

});
