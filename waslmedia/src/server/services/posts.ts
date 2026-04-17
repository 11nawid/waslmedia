import { mapPost } from '@/server/mappers/content';
import {
  createPostRow,
  deletePostRow,
  findPostById,
  findPostReaction,
  listPostsByAuthor,
  setPostReaction,
  updatePostPoll,
} from '@/server/repositories/posts';

type PollInput = {
  question: string;
  options: { text: string; votes: number }[];
  voters?: Record<string, number>;
};

export async function createPost(input: {
  authorId: string;
  text: string;
  imageUrl?: string;
  poll?: PollInput;
}) {
  const id = await createPostRow({
    authorId: input.authorId,
    text: input.text,
    imageUrl: input.imageUrl,
    poll: input.poll ? JSON.stringify(input.poll) : undefined,
  });

  const created = await findPostById(id);
  return created ? mapPost(created) : null;
}

export async function getPostsByAuthorId(authorId: string) {
  const rows = await listPostsByAuthor(authorId);
  return rows.map(mapPost);
}

export async function deletePost(postId: string, authorId: string) {
  await deletePostRow(postId, authorId);
}

export async function getPostInteractionStatus(postId: string, userId: string) {
  const reaction = await findPostReaction(userId, postId);
  return {
    liked: reaction === 'like',
    disliked: reaction === 'dislike',
  };
}

export async function reactToPost(postId: string, userId: string, reaction: 'like' | 'dislike') {
  const current = await findPostReaction(userId, postId);
  const nextReaction = current === reaction ? null : reaction;
  await setPostReaction(userId, postId, nextReaction);
  return getPostInteractionStatus(postId, userId);
}

export async function voteOnPoll(postId: string, userId: string, optionIndex: number) {
  const post = await findPostById(postId);
  if (!post) {
    throw new Error('POST_NOT_FOUND');
  }

  const mapped = mapPost(post);
  const poll = mapped.poll;
  if (!poll) {
    throw new Error('POLL_NOT_FOUND');
  }

  const voters = poll.voters || {};
  const previousVote = voters[userId];

  if (previousVote !== undefined && poll.options[previousVote]) {
    poll.options[previousVote].votes = Math.max(poll.options[previousVote].votes - 1, 0);
  }

  if (!poll.options[optionIndex]) {
    throw new Error('INVALID_POLL_OPTION');
  }

  poll.options[optionIndex].votes += 1;
  voters[userId] = optionIndex;
  poll.voters = voters;

  await updatePostPoll(postId, JSON.stringify(poll));

  const updated = await findPostById(postId);
  return updated ? mapPost(updated) : null;
}
