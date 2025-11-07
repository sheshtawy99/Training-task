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

describe('Comment Integration Tests', () => {

  describe('Delete Comment Policy', () => {
    it('should allow comment author to delete their own comment', async () => {
      await grantControllerPermissions(strapi, 'post');
      await grantControllerPermissions(strapi, 'comment');
      await createUserRequiredPermissions(strapi);

      const postAuthor = await createTestUser(strapi, { username: "postAuthor3", email: "postauthor3@ex.com", password: "password123" });
      const commentAuthor = await createTestUser(strapi, { username: "commentAuthor1", email: "commentauthor1@ex.com", password: "password123" });

      // Create a post
      const postRes = await request(strapi.server.httpServer)
        .post('/api/posts?populate=author')
        .set('Authorization', postAuthor.authHeader)
        .send({ data: { body: 'Post for comment deletion test' } })
        .expect(HTTP_STATUS.CREATED);

      const postId = postRes.body.data.documentId;

      // Create a comment on the post
      const commentRes = await request(strapi.server.httpServer)
        .post('/api/comments?populate=author')
        .set('Authorization', commentAuthor.authHeader)
        .send({ data: { body: 'Comment to be deleted by author', post: postId } })
        .expect(HTTP_STATUS.CREATED);

      const commentId = commentRes.body.data.documentId;

      // Delete the comment as the comment author
      await request(strapi.server.httpServer)
        .delete(`/api/comments/${commentId}`)
        .set('Authorization', commentAuthor.authHeader)
        .expect(HTTP_STATUS.NO_CONTENT);
    });

    it('should allow post author to delete comments on their post', async () => {
      await grantControllerPermissions(strapi, 'post');
      await grantControllerPermissions(strapi, 'comment');
      await createUserRequiredPermissions(strapi);

      const postAuthor = await createTestUser(strapi, { username: "postAuthor4", email: "postauthor4@ex.com", password: "password123" });
      const commentAuthor = await createTestUser(strapi, { username: "commentAuthor2", email: "commentauthor2@ex.com", password: "password123" });

      // Create a post
      const postRes = await request(strapi.server.httpServer)
        .post('/api/posts?populate=author')
        .set('Authorization', postAuthor.authHeader)
        .send({ data: { body: 'Post owned by author for deletion test' } })
        .expect(HTTP_STATUS.CREATED);

      const postId = postRes.body.data.documentId;

      // Create a comment on the post by someone else
      const commentRes = await request(strapi.server.httpServer)
        .post('/api/comments?populate=author')
        .set('Authorization', commentAuthor.authHeader)
        .send({ data: { body: 'Comment on the post', post: postId } })
        .expect(HTTP_STATUS.CREATED);

      const commentId = commentRes.body.data.documentId;

      // Delete the comment as the post author
      await request(strapi.server.httpServer)
        .delete(`/api/comments/${commentId}`)
        .set('Authorization', postAuthor.authHeader)
        .expect(HTTP_STATUS.NO_CONTENT);
    });

    it('should prevent user who is neither comment author nor post author from deleting comment', async () => {
      await grantControllerPermissions(strapi, 'post');
      await grantControllerPermissions(strapi, 'comment');
      await createUserRequiredPermissions(strapi);

      const postAuthor = await createTestUser(strapi, { username: "postAuthor5", email: "postauthor5@ex.com", password: "password123" });
      const commentAuthor = await createTestUser(strapi, { username: "commentAuthor3", email: "commentauthor3@ex.com", password: "password123" });
      const randomUser = await createTestUser(strapi, { username: "randomUser1", email: "randomuser1@ex.com", password: "password123" });

      // Create a post
      const postRes = await request(strapi.server.httpServer)
        .post('/api/posts?populate=author')
        .set('Authorization', postAuthor.authHeader)
        .send({ data: { body: 'Post for unauthorized deletion test' } })
        .expect(HTTP_STATUS.CREATED);

      const postId = postRes.body.data.documentId;

      // Create a comment
      const commentRes = await request(strapi.server.httpServer)
        .post('/api/comments?populate=author')
        .set('Authorization', commentAuthor.authHeader)
        .send({ data: { body: 'Comment on the post', post: postId } })
        .expect(HTTP_STATUS.CREATED);

      const commentId = commentRes.body.data.documentId;

      // Try to delete the comment as a random user
      const deleteRes = await request(strapi.server.httpServer)
        .delete(`/api/comments/${commentId}`)
        .set('Authorization', randomUser.authHeader)
        .expect(HTTP_STATUS.FORBIDDEN);

      expect(deleteRes.body.error).toBeDefined();
    });

    it('should return error when deleting non-existent comment', async () => {
      await grantControllerPermissions(strapi, 'comment');
      await createUserRequiredPermissions(strapi);

      const user = await createTestUser(strapi, { username: "user2", email: "user2@ex.com", password: "password123" });

      // Try to delete a non-existent comment
      const deleteRes = await request(strapi.server.httpServer)
        .delete('/api/comments/nonexistent-comment-id-12345')
        .set('Authorization', user.authHeader)
        .expect(HTTP_STATUS.NOT_FOUND);

      expect(deleteRes.body.error).toBeDefined();
    });
  });

  describe('Attach Author Middleware - Comments', () => {
    it('should auto-attach authenticated user as author when creating comment', async () => {
      await grantControllerPermissions(strapi, 'post');
      await grantControllerPermissions(strapi, 'comment');
      await createUserRequiredPermissions(strapi);

      const postAuthor = await createTestUser(strapi, { username: "postAuthor6", email: "postauthor6@ex.com", password: "password123" });
      const commentAuthor = await createTestUser(strapi, { username: "commentAuthor4", email: "commentauthor4@ex.com", password: "password123" });

      // Create a post
      const postRes = await request(strapi.server.httpServer)
        .post('/api/posts?populate=author')
        .set('Authorization', postAuthor.authHeader)
        .send({ data: { body: 'Post for comment author test' } })
        .expect(HTTP_STATUS.CREATED);

      const postId = postRes.body.data.documentId;

      // Create a comment without explicitly setting author
      const commentRes = await request(strapi.server.httpServer)
        .post('/api/comments?populate=author')
        .set('Authorization', commentAuthor.authHeader)
        .send({ data: { body: 'Comment with auto-attached author', post: postId } })
        .expect(HTTP_STATUS.CREATED);

      // Verify author was automatically attached
      expect(commentRes.body.data.author).toBeDefined();
      expect(commentRes.body.data.author.documentId).toBe(commentAuthor.user.documentId);
    });
  });

  describe('Validate Comment Post Middleware', () => {
    it('should return 400 error when creating comment without post ID', async () => {
      await grantControllerPermissions(strapi, 'comment');
      await createUserRequiredPermissions(strapi);

      const user = await createTestUser(strapi, { username: "commentCreator1", email: "commentcreator1@ex.com", password: "password123" });

      // Try to create a comment without post ID
      const res = await request(strapi.server.httpServer)
        .post('/api/comments')
        .set('Authorization', user.authHeader)
        .send({ data: { body: 'Comment without post ID' } })
        .expect(HTTP_STATUS.BAD_REQUEST);

      expect(res.body.error).toBeDefined();
      expect(res.body.error.message).toContain('post');
    });

    it('should successfully create comment when post ID is provided', async () => {
      await grantControllerPermissions(strapi, 'post');
      await grantControllerPermissions(strapi, 'comment');
      await createUserRequiredPermissions(strapi);

      const postAuthor = await createTestUser(strapi, { username: "postAuthor7", email: "postauthor7@ex.com", password: "password123" });
      const commentAuthor = await createTestUser(strapi, { username: "commentAuthor5", email: "commentauthor5@ex.com", password: "password123" });

      // Create a post
      const postRes = await request(strapi.server.httpServer)
        .post('/api/posts?populate=author')
        .set('Authorization', postAuthor.authHeader)
        .send({ data: { body: 'Post for valid comment creation' } })
        .expect(HTTP_STATUS.CREATED);

      const postId = postRes.body.data.documentId;

      // Create a comment with post ID
      const commentRes = await request(strapi.server.httpServer)
        .post('/api/comments?populate=author&populate=post')
        .set('Authorization', commentAuthor.authHeader)
        .send({ data: { body: 'Valid comment with post ID', post: postId } })
        .expect(HTTP_STATUS.CREATED);

      expect(commentRes.body.data).toBeDefined();
      expect(commentRes.body.data.body).toBe('Valid comment with post ID');
      expect(commentRes.body.data.post).toBeDefined();
    });
  });

});
