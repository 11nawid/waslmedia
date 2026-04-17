import { randomUUID } from 'crypto';
import { RowDataPacket } from 'mysql2';
import { dbPool } from '@/db/pool';

export interface PostRow extends RowDataPacket {
  id: string;
  author_id: string;
  text: string;
  image_url: string | null;
  poll: string | null;
  likes: number;
  dislikes: number;
  comment_count: number;
  created_at: Date | string;
  author_name: string;
  author_image_url: string | null;
  author_handle: string;
}

const BASE_POST_SELECT = `
  SELECT
    p.id,
    p.author_id,
    p.text,
    p.image_url,
    p.poll,
    p.likes,
    p.dislikes,
    p.comment_count,
    p.created_at,
    ch.name AS author_name,
    ch.profile_picture_url AS author_image_url,
    ch.handle AS author_handle
  FROM posts p
  INNER JOIN channels ch ON ch.user_id = p.author_id
`;

export async function listPostsByAuthor(authorId: string) {
  const [rows] = await dbPool.query<PostRow[]>(
    `${BASE_POST_SELECT}
     WHERE p.author_id = ?
     ORDER BY p.created_at DESC`,
    [authorId]
  );

  return rows;
}

export async function findPostById(postId: string) {
  const [rows] = await dbPool.query<PostRow[]>(
    `${BASE_POST_SELECT}
     WHERE p.id = ?
     LIMIT 1`,
    [postId]
  );

  return rows[0] || null;
}

export async function createPostRow(input: {
  authorId: string;
  text: string;
  imageUrl?: string;
  poll?: string;
}) {
  const id = randomUUID();
  await dbPool.query(
    `INSERT INTO posts (id, author_id, text, image_url, poll)
     VALUES (?, ?, ?, ?, ?)`,
    [id, input.authorId, input.text, input.imageUrl || '', input.poll || null]
  );

  return id;
}

export async function deletePostRow(postId: string, authorId: string) {
  await dbPool.query(`DELETE FROM posts WHERE id = ? AND author_id = ?`, [postId, authorId]);
}

export async function findPostReaction(userId: string, postId: string) {
  const [rows] = await dbPool.query<RowDataPacket[]>(
    `SELECT reaction FROM post_reactions WHERE user_id = ? AND post_id = ? LIMIT 1`,
    [userId, postId]
  );

  return rows[0]?.reaction ? String(rows[0].reaction) : null;
}

export async function setPostReaction(userId: string, postId: string, reaction: 'like' | 'dislike' | null) {
  const connection = await dbPool.getConnection();

  try {
    await connection.beginTransaction();
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT reaction FROM post_reactions WHERE user_id = ? AND post_id = ? LIMIT 1`,
      [userId, postId]
    );
    const existing = rows[0]?.reaction ? String(rows[0].reaction) : null;

    if (existing === 'like') {
      await connection.query(`UPDATE posts SET likes = GREATEST(likes - 1, 0) WHERE id = ?`, [postId]);
    }
    if (existing === 'dislike') {
      await connection.query(`UPDATE posts SET dislikes = GREATEST(dislikes - 1, 0) WHERE id = ?`, [postId]);
    }

    if (!reaction) {
      await connection.query(`DELETE FROM post_reactions WHERE user_id = ? AND post_id = ?`, [userId, postId]);
    } else {
      await connection.query(
        `INSERT INTO post_reactions (user_id, post_id, reaction)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE reaction = VALUES(reaction), created_at = CURRENT_TIMESTAMP`,
        [userId, postId, reaction]
      );
      await connection.query(
        `UPDATE posts SET ${reaction === 'like' ? 'likes' : 'dislikes'} = ${reaction === 'like' ? 'likes' : 'dislikes'} + 1 WHERE id = ?`,
        [postId]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updatePostPoll(postId: string, poll: string) {
  await dbPool.query(`UPDATE posts SET poll = ? WHERE id = ?`, [poll, postId]);
}
