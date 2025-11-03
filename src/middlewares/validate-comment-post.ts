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
      const { errors } = await import('@strapi/utils');
      const { PolicyError } = errors;
      throw new PolicyError('You must include the post ID for this comment!', {
        policy: 'validate-comment-post',
      });
    }

    await next();
  };
};
