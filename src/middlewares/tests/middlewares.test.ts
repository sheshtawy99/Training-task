import { Context } from 'koa';
import { Core } from '@strapi/strapi';
import attachAuthor from '../attach-author';

describe('attach-author Middleware', () => {
  const mockStrapi = {
    log: {
      info: jest.fn(),
    },
  } as unknown as Core.Strapi;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('✅ attaches the user id as author to the request body', async () => {
    const mockCtx = {
      state: {
        user: { id: 1 },
      },
      request: {
        body: {} as any,
      },
    } as Context;

    const nextFn = jest.fn();
    const middleware = attachAuthor({}, { strapi: mockStrapi });

    await middleware(mockCtx, nextFn);

    // Verify the author was attached correctly
    expect(mockCtx.request.body.data.author).toBe(1);
    
    expect(nextFn).toHaveBeenCalled();
  });

  it('✅ initializes empty body and data objects if they don\'t exist', async () => {
    const mockCtx = {
      state: {
        user: { id: 1 },
      },
      request: {} as any,
    } as Context;

    const nextFn = jest.fn();
    const middleware = attachAuthor({}, { strapi: mockStrapi });

    await middleware(mockCtx, nextFn);

    // Verify body and data objects were initialized
    expect(mockCtx.request.body).toBeDefined();
    expect(mockCtx.request.body.data).toBeDefined();
    expect(mockCtx.request.body.data.author).toBe(1);
    expect(nextFn).toHaveBeenCalled();
  });
});