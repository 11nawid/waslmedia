import { randomUUID } from 'crypto';
import { RowDataPacket } from 'mysql2';
import { dbPool } from '@/db/pool';

export interface CommentRow extends RowDataPacket {
  id: string;
  video_id: string | null;
  post_id: string | null;
  parent_id: string | null;
  author_id: string;
  text: string;
  likes: number;
  created_at: Date | string;
  updated_at: Date | string;
  author_name: string;
  author_image_url: string | null;
}

const BASE_COMMENT_SELECT = `
  SELECT
    c.id,
    c.video_id,
    c.post_id,
    c.parent_id,
    c.author_id,
    c.text,
    c.likes,
    c.created_at,
    c.updated_at,
    ch.name AS author_name,
    ch.profile_picture_url AS author_image_url
  FROM comments c
  INNER JOIN channels ch ON ch.user_id = c.author_id
`;

export async function listCommentsForParent(input: {
  parentId: string;
  parentType: 'video' | 'post';
  sortBy?: 'created_at' | 'likes';
}) {
  const foreignKey = input.parentType === 'video' ? 'video_id' : 'post_id';
  const orderColumn = input.sortBy === 'likes' ? 'c.likes' : 'c.created_at';
  const [rows] = await dbPool.query<CommentRow[]>(
    `${BASE_COMMENT_SELECT}
     WHERE c.${foreignKey} = ?
     ORDER BY ${orderColumn} DESC, c.created_at DESC`,
    [input.parentId]
  );

  return rows;
}

export async function createCommentRow(input: {
  videoId?: string | null;
  postId?: string | null;
  parentId?: string | null;
  authorId: string;
  text: string;
}) {
  const id = randomUUID();
  await dbPool.query(
    `INSERT INTO comments (id, video_id, post_id, parent_id, author_id, text)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, input.videoId || null, input.postId || null, input.parentId || null, input.authorId, input.text]
  );

  if (input.videoId) {
    await dbPool.query(`UPDATE videos SET comment_count = comment_count + 1 WHERE id = ?`, [input.videoId]);
  }
  if (input.postId) {
    await dbPool.query(`UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?`, [input.postId]);
  }

  return id;
}

export async function updateCommentRow(commentId: string, authorId: string, text: string) {
  await dbPool.query(
    `UPDATE comments SET text = ? WHERE id = ? AND author_id = ?`,
    [text, commentId, authorId]
  );
}

export async function findCommentRowById(commentId: string) {
  const [rows] = await dbPool.query<CommentRow[]>(
    `${BASE_COMMENT_SELECT}
     WHERE c.id = ?
     LIMIT 1`,
    [commentId]
  );

  return rows[0] || null;
}

export async function deleteCommentRow(commentId: string, authorId?: string) {
  const existing = await findCommentRowById(commentId);
  if (!existing) {
    return null;
  }

  const connection = await dbPool.getConnection();

  try {
    await connection.beginTransaction();
    const params = authorId ? [commentId, authorId] : [commentId];
    await connection.query(
      `DELETE FROM comments WHERE id = ? ${authorId ? 'AND author_id = ?' : ''}`,
      params
    );
    await connection.query(`DELETE FROM comments WHERE parent_id = ?`, [commentId]);
    await connection.query(`DELETE FROM comment_reactions WHERE comment_id = ?`, [commentId]);

    if (existing.video_id) {
      await connection.query(`UPDATE videos SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = ?`, [existing.video_id]);
    }
    if (existing.post_id) {
      await connection.query(`UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = ?`, [existing.post_id]);
    }

    await connection.commit();
    return existing;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function toggleCommentLike(commentId: string, userId: string) {
  const connection = await dbPool.getConnection();

  try {
    await connection.beginTransaction();
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT 1 FROM comment_reactions WHERE user_id = ? AND comment_id = ? LIMIT 1`,
      [userId, commentId]
    );

    if (rows[0]) {
      await connection.query(`DELETE FROM comment_reactions WHERE user_id = ? AND comment_id = ?`, [userId, commentId]);
      await connection.query(`UPDATE comments SET likes = GREATEST(likes - 1, 0) WHERE id = ?`, [commentId]);
      await connection.commit();
      return false;
    }

    await connection.query(
      `INSERT INTO comment_reactions (user_id, comment_id, reaction) VALUES (?, ?, 'like')`,
      [userId, commentId]
    );
    await connection.query(`UPDATE comments SET likes = likes + 1 WHERE id = ?`, [commentId]);
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listCommentsForVideosByAuthor(authorId: string) {
  const [rows] = await dbPool.query<CommentRow[]>(
    `${BASE_COMMENT_SELECT}
     INNER JOIN videos v ON v.id = c.video_id
     WHERE v.author_id = ? AND c.parent_id IS NULL
     ORDER BY c.created_at DESC`,
    [authorId]
  );

  return rows;
}
