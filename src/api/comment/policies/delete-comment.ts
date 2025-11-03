export default async (policyContext, config, { strapi }) => {
  const { user } = policyContext.state;
  const { request, params, route, ctx } = policyContext;
  const method = request.method.toLowerCase();
  const { errors } = require('@strapi/utils');
  const { PolicyError } = errors;
  // Deletion rules
  if (method === 'delete') {
    const documentId = params.id;

    // Find the comment with author and post.author populated
    const comment = await strapi.documents('api::comment.comment').findOne({
      documentId,
      populate: ['author', 'post.author'],
    });

    if (!comment) throw new PolicyError('comment not found', {
      policy: 'is-post-author-delete',
    });
    

    const isCommentAuthor = comment.author?.id === user.id;
    const isPostAuthor = comment.post?.author?.id === user.id;

    if (!isCommentAuthor && !isPostAuthor)throw new PolicyError('You can only delete your own comments or comments on your posts', {
      policy: 'is-post-author-delete',
    });
    
  }

  return true;
};
