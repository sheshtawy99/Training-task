import { errors } from '@strapi/utils';
import deletepost from '../../policies/delete-post';

const { PolicyError } = errors;

describe('Post Policies', () => {
  describe('Policy: delete-post', () => {
    const baseContext = {
      state: { user: { id: 1 } },
      params: { id: 'post-123' },
      request: { method: 'DELETE' },
      ctx: {},
    };

    const findOne = jest.fn();

    const mockStrapi = {
      documents: jest.fn(() => ({
        findOne,
      })),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('✅ allows the post author to delete', async () => {
      findOne.mockResolvedValueOnce({
        author: { id: 1 },
        post: { author: { id: 2 } },
      });
      const result = await deletepost(baseContext, {}, { strapi: mockStrapi });
      expect(result).toBe(true);
    });

    it('❌ throws if not the post author', async () => {
      findOne.mockResolvedValueOnce({
        author: { id: 2 },
        post: { author: { id: 2 } },
      });
      await expect(
        deletepost(baseContext, {}, { strapi: mockStrapi })
      ).rejects.toThrow('You can only delete your own posts');
    });
  });
});
