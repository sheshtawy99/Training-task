import { Context } from 'koa';
import { Core } from '@strapi/strapi';
import attachAuthor from '../attach-author';
import validateCommentPost from '../validate-comment-post';

describe('Middleware Tests', () => {
  const mockStrapi = {
    log: {
      info: jest.fn(),
      error: jest.fn(),
    },
  } as unknown as Core.Strapi;

  beforeEach(() => {
    jest.clearAllMocks();
    // @ts-ignore
    global.strapi = mockStrapi;
  });

  // --- attach-author middleware ---
  describe('attach-author Middleware', () => {
    it('✅ attaches the user id as author to the request body', async () => {
      const mockCtx = {
        state: { user: { id: 1 } },
        request: { body: {} },
      } as Context;

      const nextFn = jest.fn();
      const middleware = attachAuthor({}, { strapi: mockStrapi });

      await middleware(mockCtx, nextFn);

      expect(mockCtx.request.body.data.author).toBe(1);
      expect(nextFn).toHaveBeenCalled();
    });
  });

  // --- validate-comment-post middleware ---
  describe('validate-comment-post Middleware', () => {
    it('🚫 throws 400 error when post ID is missing', async () => {
      const mockCtx = {
        state: { user: { id: 1 } },
        request: { body: { data: {} } },
        throw: jest.fn((status: number, message: string) => {
          const err = new Error(message);
          // mimic Koa's behavior
          (err as any).status = status;
          throw err;
        }),
      } as unknown as Context;

      const nextFn = jest.fn();
      const middleware = validateCommentPost();

      await expect(middleware(mockCtx, nextFn)).rejects.toThrow('You must include the post ID for this comment!');
      expect(mockCtx.throw).toHaveBeenCalledWith(400, 'You must include the post ID for this comment!');
      expect(nextFn).not.toHaveBeenCalled();
    });

it('✅ calls next() when post ID is provided', async () => {
  const mockCtx = {
    state: { user: { id: 1 } },
    request: { body: { data: { post: 42 } } },
    throw: jest.fn(),
  } as unknown as Context;

  const nextFn = jest.fn();
  const middleware = validateCommentPost();

  await middleware(mockCtx, nextFn);

  expect(nextFn).toHaveBeenCalled();
  expect(strapi.log.info).toHaveBeenCalledWith('validate-comment-post middleware running');
});

  });
});
