export default async (policyContext, config, { strapi }) => {
  const { user } = policyContext.state;
  const { params } = policyContext;
  const { errors } = require('@strapi/utils');
  const { PolicyError , NotFoundError } = errors;

  const documentId = params.id;

  // Find the post with its author populated
  const post = await strapi.documents('api::post.post').findOne({
    documentId,
    populate: ['author'],
  });

  // Post not found
  if (!post) {
    throw new errors.NotFoundError('post not found');
  }

  // Check if current user is the author
  const isAuthor = post.author?.id === user.id;

  if (!isAuthor) {
    throw new PolicyError('You can only delete your own posts', {
      policy: 'is-post-author-delete',
    });
  }

  return true;
};
