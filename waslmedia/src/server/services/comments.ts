import { mapComment, nestComments } from '@/server/mappers/content';
import {
  createCommentRow,
  deleteCommentRow,
  findCommentRowById,
  listCommentsForParent,
  listCommentsForVideosByAuthor,
  toggleCommentLike,
  updateCommentRow,
} from '@/server/repositories/comments';
import { findVideoRowById } from '@/server/repositories/videos';
import { recordAnalyticsActivity } from '@/server/services/video-analytics';

export async function getComments(parentId: string, parentType: 'video' | 'post', sortBy: 'createdAt' | 'likes' = 'createdAt') {
  const rows = await listCommentsForParent({
    parentId,
    parentType,
    sortBy: sortBy === 'likes' ? 'likes' : 'created_at',
  });

  return nestComments(rows.map(mapComment));
}

export async function createComment(input: {
  parentId: string;
  parentType: 'video' | 'post';
  authorId: string;
  text: string;
  replyToCommentId?: string | null;
}) {
  const id = await createCommentRow({
    videoId: input.parentType === 'video' ? input.parentId : null,
    postId: input.parentType === 'post' ? input.parentId : null,
    parentId: input.replyToCommentId || null,
    authorId: input.authorId,
    text: input.text,
  });

  const comment = await findCommentRowById(id);
  if (input.parentType === 'video') {
    await recordAnalyticsActivity({
      videoId: input.parentId,
      actorUserId: input.authorId,
      type: 'comment',
      deltas: { comments: 1 },
    });
  }
  return comment ? mapComment(comment) : null;
}

export async function editComment(commentId: string, authorId: string, text: string) {
  await updateCommentRow(commentId, authorId, text);
  const updated = await findCommentRowById(commentId);
  return updated ? mapComment(updated) : null;
}

export async function removeComment(commentId: string, authorId?: string) {
  const deleted = await deleteCommentRow(commentId, authorId);
  if (deleted?.video_id) {
    await recordAnalyticsActivity({
      videoId: deleted.video_id,
      actorUserId: authorId || null,
      type: 'comment',
      value: -1,
      deltas: { comments: -1 },
    });
  }
  return deleted ? mapComment(deleted) : null;
}

export async function toggleCommentReaction(commentId: string, userId: string) {
  const liked = await toggleCommentLike(commentId, userId);
  const comment = await findCommentRowById(commentId);
  return {
    liked,
    comment: comment ? mapComment(comment) : null,
  };
}

export async function getCommentsForUserVideos(userId: string) {
  const rows = await listCommentsForVideosByAuthor(userId);
  const mapped = await Promise.all(
    rows.map(async (row) => {
      const video = row.video_id ? await findVideoRowById(row.video_id) : null;
      return {
        ...mapComment(row),
        videoTitle: video?.title || 'Untitled video',
      };
    })
  );

  return mapped;
}
