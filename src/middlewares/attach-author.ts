// src/middlewares/attach-author.ts
export default (config: any, { strapi }: any) => {
  return async (ctx: any, next: () => Promise<void>) => {
    strapi.log.info('Attach-author middleware running');

    const user = ctx.state.user
    console.log('Author attached:', user.id);
    

    if (!user) {
      strapi.log.warn('No authenticated user, skipping attach-author');
      return await next(); // skip if unauthenticated
    }

    ctx.request.body = ctx.request.body || {};
    ctx.request.body.data = ctx.request.body.data || {};
    ctx.request.body.data.author = user.id;

    strapi.log.info(`Author attached: ${JSON.stringify(ctx.request.body.data)}`);

    await next();
    strapi.log.info('Author attached:', user.id);
    strapi.log.info('Author attached:');
  };
};
