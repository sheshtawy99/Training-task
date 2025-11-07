import { errors } from '@strapi/utils';
import DeleteComment from '../../policies/delete-comment';
import { COMMENT_ERRORS } from '../../../../../tests/constants/errors';

const { PolicyError } = errors;

describe('Comment Policies', () => {

  // ------------------- Delete Comment Policy -------------------
  describe('Policy: delete-comment', () => {
    const findOne = jest.fn();

    const mockStrapi = {
      documents: jest.fn(() => ({
        findOne,
      })),
    };

    const baseContext = {
      state: { user: { id: 1 } },
      params: { id: 'comment-123' },
      request: { method: 'DELETE' },
      ctx: {},
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('✅ allows the comment author to delete', async () => {
      findOne.mockResolvedValueOnce({
        author: { id: 1 },
        post: { author: { id: 2 } },
      });

      const result = await DeleteComment(baseContext, {}, { strapi: mockStrapi });
      expect(result).toBe(true);
    });

    it('✅ allows the post author to delete', async () => {
      findOne.mockResolvedValueOnce({
        author: { id: 2 },
        post: { author: { id: 1 } },
      });

      const result = await DeleteComment(baseContext, {}, { strapi: mockStrapi });
      expect(result).toBe(true);
    });

    it('❌ throws if neither author nor post author', async () => {
      findOne.mockResolvedValueOnce({
        author: { id: 2 },
        post: { author: { id: 3 } },
      });

      await expect(
        DeleteComment(baseContext, {}, { strapi: mockStrapi })
      ).rejects.toThrow(PolicyError);
    });

    it('❌ throws if comment not found', async () => {
      findOne.mockResolvedValueOnce(null);

      await expect(
        DeleteComment(baseContext, {}, { strapi: mockStrapi })
      ).rejects.toThrow(COMMENT_ERRORS.NOT_FOUND);
    });


  });
});