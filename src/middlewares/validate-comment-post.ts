// path: src/middlewares/validate-comment-post/index.ts
export default () => {
  return async (ctx: any, next: any) => {
    const { user } = ctx.state; // authenticated user
    const { request } = ctx;

    // Debug logs
    strapi.log.info('validate-comment-post middleware running');
    strapi.log.info('Request body:', request.body);
    strapi.log.info('Authenticated user:', user);

    // Ensure request has post data
    if (!request.body?.data?.post) {
      // Throw a normal HTTP 400 error instead of a PolicyError
      ctx.throw(400, 'You must include the post ID for this comment!');
    }

    await next();
  };
};
