// src/middlewares/attach-author.ts
export default (config: any, { strapi }: any) => {
  return async (ctx: any, next: () => Promise<void>) => {
    
    const user = ctx.state.user
  
    if (!user) {
      strapi.log.warn('No authenticated user, skipping attach-author');
      return await next(); // skip if unauthenticated
    }
    ctx.request.body = ctx.request.body || {};
    ctx.request.body.data = ctx.request.body.data || {};
    ctx.request.body.data.author = user.id;

    await next();
    
  };
};
