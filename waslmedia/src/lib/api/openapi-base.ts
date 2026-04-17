export type JsonSchema = Record<string, unknown>;
export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

type OperationConfig = {
  operationId: string;
  summary: string;
  description?: string;
  tags: string[];
  auth?: boolean;
  query?: JsonSchema;
  params?: JsonSchema;
  requestBody?: JsonSchema;
  responses?: Record<string, JsonSchema>;
};

const jsonContent = (schema: JsonSchema) => ({
  'application/json': { schema },
});

export const objectSchema = (properties: Record<string, JsonSchema>, required: string[] = []) => ({
  type: 'object',
  properties,
  ...(required.length ? { required } : {}),
});

export const arraySchema = (items: JsonSchema) => ({
  type: 'array',
  items,
});

export const ref = (name: string) => ({
  $ref: `#/components/schemas/${name}`,
});

const queryParameter = (name: string, schema: JsonSchema, description?: string) => ({
  name,
  in: 'query',
  required: false,
  ...(description ? { description } : {}),
  schema,
});

const pathParameter = (name: string, description: string) => ({
  name,
  in: 'path',
  required: true,
  description,
  schema: { type: 'string' },
});

export function createOperation(config: OperationConfig) {
  const responses = {
    '200': {
      description: 'Success',
      ...(config.responses?.['200'] ? { content: jsonContent(config.responses['200']) } : {}),
    },
    ...(config.auth
      ? {
          '401': {
            description: 'Authentication required',
            content: jsonContent(ref('ApiError')),
          },
        }
      : {}),
    ...Object.fromEntries(
      Object.entries(config.responses || {}).filter(([status]) => status !== '200').map(([status, schema]) => [
        status,
        {
          description: status === '201' ? 'Created' : status === '400' ? 'Bad request' : 'Response',
          content: jsonContent(schema),
        },
      ])
    ),
  };

  return {
    operationId: config.operationId,
    summary: config.summary,
    ...(config.description ? { description: config.description } : {}),
    tags: config.tags,
    ...(config.auth ? { security: [{ sessionCookie: [] }] } : {}),
    ...(config.query || config.params
      ? {
          parameters: [
            ...(config.params
              ? Object.entries(config.params).map(([name, schema]) =>
                  pathParameter(name, `${name} path parameter`)
                )
              : []),
            ...(config.query
              ? Object.entries(config.query).map(([name, schema]) =>
                  queryParameter(name, schema as JsonSchema, `${name} query parameter`)
                )
              : []),
          ],
        }
      : {}),
    ...(config.requestBody
      ? {
          requestBody: {
            required: true,
            content: jsonContent(config.requestBody),
          },
        }
      : {}),
    responses,
  };
}

export const schemas = {
  ApiError: objectSchema(
    {
      error: { type: 'string' },
      message: { type: 'string' },
    },
    ['error']
  ),
  AuthUser: objectSchema(
    {
      uid: { type: 'string' },
      id: { type: 'string' },
      email: { type: 'string' },
      displayName: { type: 'string' },
      handle: { type: 'string' },
      photoURL: { type: 'string' },
      bannerUrl: { type: 'string' },
      subscriptions: arraySchema({ type: 'string' }),
      watchLater: arraySchema({ type: 'string' }),
    },
    ['uid', 'email', 'displayName', 'handle']
  ),
  Channel: objectSchema(
    {
      id: { type: 'string' },
      name: { type: 'string' },
      handle: { type: 'string' },
      description: { type: 'string' },
      profilePictureUrl: { type: 'string' },
      bannerUrl: { type: 'string' },
      subscriberCount: { type: 'number' },
      totalViews: { type: 'number' },
      joinedAt: { type: 'string' },
    },
    ['id', 'name', 'handle']
  ),
  Video: objectSchema(
    {
      id: { type: 'string' },
      title: { type: 'string' },
      description: { type: 'string' },
      thumbnailUrl: { type: 'string' },
      videoUrl: { type: 'string' },
      authorId: { type: 'string' },
      authorName: { type: 'string' },
      authorHandle: { type: 'string' },
      visibility: { type: 'string', enum: ['private', 'unlisted', 'public'] },
      category: { type: 'string' },
      duration: { type: 'number' },
      viewCount: { type: 'number' },
      likes: { type: 'number' },
      dislikes: { type: 'number' },
      uploadedAt: { type: 'string' },
    },
    ['id', 'title', 'authorId']
  ),
  Comment: objectSchema(
    {
      id: { type: 'string' },
      parentId: { type: 'string' },
      parentType: { type: 'string', enum: ['video', 'post'] },
      authorId: { type: 'string' },
      authorName: { type: 'string' },
      authorImageUrl: { type: 'string' },
      text: { type: 'string' },
      likes: { type: 'number' },
      createdAt: { type: 'string' },
      replyCount: { type: 'number' },
      replies: arraySchema(ref('Comment')),
    },
    ['id', 'parentId', 'parentType', 'authorId', 'text']
  ),
  Playlist: objectSchema(
    {
      id: { type: 'string' },
      name: { type: 'string' },
      description: { type: 'string' },
      visibility: { type: 'string', enum: ['private', 'unlisted', 'public'] },
      authorId: { type: 'string' },
      videoCount: { type: 'number' },
      firstVideoThumbnail: { type: 'string' },
      videos: arraySchema(ref('Video')),
    },
    ['id', 'name', 'authorId']
  ),
  PollOption: objectSchema(
    {
      text: { type: 'string' },
      votes: { type: 'number' },
    },
    ['text', 'votes']
  ),
  Post: objectSchema(
    {
      id: { type: 'string' },
      text: { type: 'string' },
      imageUrl: { type: 'string' },
      authorId: { type: 'string' },
      authorName: { type: 'string' },
      authorHandle: { type: 'string' },
      authorImageUrl: { type: 'string' },
      likes: { type: 'number' },
      dislikes: { type: 'number' },
      commentCount: { type: 'number' },
      createdAt: { type: 'string' },
      poll: objectSchema({
        question: { type: 'string' },
        options: arraySchema(ref('PollOption')),
      }),
    },
    ['id', 'authorId', 'text']
  ),
  AudioTrack: objectSchema(
    {
      id: { type: 'string' },
      title: { type: 'string' },
      artist: { type: 'string' },
      genre: { type: 'string' },
      duration: { type: 'number' },
      url: { type: 'string' },
    },
    ['id', 'title', 'url']
  ),
  Analytics: objectSchema({
    videoCount: { type: 'number' },
    totalViews: { type: 'number' },
    subscriberCount: { type: 'number' },
    recentSubscribers: arraySchema(ref('Channel')),
    recentComments: arraySchema(ref('Comment')),
  }),
  UploadDefaults: objectSchema({
    title: { type: 'string' },
    description: { type: 'string' },
    tags: { type: 'string' },
    category: { type: 'string' },
    visibility: { type: 'string' },
  }),
  Pagination: objectSchema({
    total: { type: 'number' },
    limit: { type: 'number' },
    offset: { type: 'number' },
    count: { type: 'number' },
    hasNextPage: { type: 'boolean' },
    hasPreviousPage: { type: 'boolean' },
  }),
  RealtimeScopeToken: objectSchema({
    scope: { type: 'string' },
    token: { type: 'string' },
  }, ['scope', 'token']),
};
