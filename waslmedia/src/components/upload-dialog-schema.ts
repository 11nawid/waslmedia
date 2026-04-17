import * as z from 'zod';

export const videoDetailsSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().optional(),
  visibility: z.enum(['private', 'unlisted', 'public'], {
    required_error: 'Visibility is required.',
  }),
  thumbnail: z.instanceof(File, { message: 'Thumbnail is required.' }).optional(),
  audience: z.enum(['madeForKids', 'notMadeForKids']).default('notMadeForKids'),
  tags: z.array(z.string()).optional(),
  language: z.string().optional(),
  category: z.string().optional(),
  commentsEnabled: z.boolean().default(true),
  showLikes: z.boolean().default(true),
});

export type VideoDetailsSchema = z.infer<typeof videoDetailsSchema>;
