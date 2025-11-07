import { COMMENT_ERRORS, COMMENT_POLICIES } from '../../../../tests/constants/errors';

export default async (policyContext, config, { strapi }) => {
  const { user } = policyContext.state;
  const { request, params, route, ctx } = policyContext;
  const method = request.method.toLowerCase();
  const { errors } = require('@strapi/utils');
  const { PolicyError , NotFoundError} = errors;
  // Deletion rules
  if (method === 'delete') {
    const documentId = params.id;

    // Find the comment with author and post.author populated
    const comment = await strapi.documents('api::comment.comment').findOne({
      documentId,
      populate: ['author', 'post.author'],
    });

    if (!comment) {
        throw new NotFoundError(COMMENT_ERRORS.NOT_FOUND); // <-- returns 404
    }


    const isCommentAuthor = comment.author?.id === user.id;
    const isPostAuthor = comment.post?.author?.id === user.id;

    if (!isCommentAuthor && !isPostAuthor){
      throw new PolicyError(COMMENT_ERRORS.UNAUTHORIZED_DELETE, {
      policy: COMMENT_POLICIES.DELETE,
    });
  }
  }

  return true;
};
