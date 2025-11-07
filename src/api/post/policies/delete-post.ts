import { POST_ERRORS, POST_POLICIES } from '../../../../tests/constants/errors';

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
    throw new errors.NotFoundError(POST_ERRORS.NOT_FOUND);
  }

  // Check if current user is the author
  const isAuthor = post.author?.id === user.id;

  if (!isAuthor) {
    throw new PolicyError(POST_ERRORS.UNAUTHORIZED_DELETE, {
      policy: POST_POLICIES.DELETE,
    });
  }

  return true;
};
