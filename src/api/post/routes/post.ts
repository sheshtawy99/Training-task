import { factories } from '@strapi/strapi';


export default factories.createCoreRouter('api::post.post', {
  config: {
    create: {
      middlewares: ['global::attach-author'], 
    },
    delete: {
      policies: ['api::post.delete-post']
    },
  },
});
