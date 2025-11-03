import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::comment.comment', {
  config: {
    create: {
      middlewares: ['global::validate-comment-post', 'global::attach-author'],
      
    },
     delete: {
      policies: ['api::comment.delete-comment']
    },
  },
});
