import { type HttpMethod, arraySchema, createOperation, objectSchema, ref, schemas } from './openapi-base';
import type { AdminDocsAccess, AdminRole } from '@/lib/admin/types';

const paths: Record<string, Partial<Record<HttpMethod, ReturnType<typeof createOperation>>>> = {
  '/api/auth/register': {
    post: createOperation({
      operationId: 'register',
      summary: 'Create a new account',
      tags: ['auth'],
      requestBody: objectSchema({
        email: { type: 'string' },
        password: { type: 'string' },
        displayName: { type: 'string' },
        handle: { type: 'string' },
      }, ['email', 'password', 'displayName', 'handle']),
      responses: { '201': objectSchema({ user: ref('AuthUser') }, ['user']) },
    }),
  },
  '/api/auth/login': {
    post: createOperation({
      operationId: 'login',
      summary: 'Sign in with email and password',
      tags: ['auth'],
      requestBody: objectSchema({
        email: { type: 'string' },
        password: { type: 'string' },
      }, ['email', 'password']),
      responses: { '200': objectSchema({ user: ref('AuthUser') }, ['user']) },
    }),
  },
  '/api/auth/logout': {
    post: createOperation({
      operationId: 'logout',
      summary: 'Sign out the current session',
      tags: ['auth'],
      auth: true,
      responses: { '200': objectSchema({ ok: { type: 'boolean' } }, ['ok']) },
    }),
  },
  '/api/auth/me': {
    get: createOperation({
      operationId: 'getCurrentUser',
      summary: 'Get the current signed-in user',
      tags: ['auth'],
      responses: { '200': objectSchema({ user: ref('AuthUser') }) },
    }),
  },
  '/api/auth/check-email': {
    get: createOperation({
      operationId: 'checkEmail',
      summary: 'Check whether an email is available',
      tags: ['auth'],
      query: { email: { type: 'string' } },
      responses: { '200': objectSchema({ available: { type: 'boolean' } }, ['available']) },
    }),
  },
  '/api/auth/check-handle': {
    get: createOperation({
      operationId: 'checkHandle',
      summary: 'Check whether a handle is available',
      tags: ['auth'],
      query: { handle: { type: 'string' } },
      responses: { '200': objectSchema({ available: { type: 'boolean' } }, ['available']) },
    }),
  },
  '/api/channel/me': {
    get: createOperation({
      operationId: 'getOwnChannel',
      summary: 'Get the current user channel settings',
      tags: ['channels'],
      auth: true,
      responses: { '200': objectSchema({ channel: ref('Channel') }, ['channel']) },
    }),
    put: createOperation({
      operationId: 'updateOwnChannel',
      summary: 'Update the current user channel settings',
      tags: ['channels'],
      auth: true,
      requestBody: objectSchema({
        name: { type: 'string' },
        handle: { type: 'string' },
        description: { type: 'string' },
        email: { type: 'string' },
        country: { type: 'string' },
        showCountry: { type: 'boolean' },
        profilePictureStorageRef: { type: 'string' },
        bannerStorageRef: { type: 'string' },
        removeProfilePicture: { type: 'boolean' },
        removeBannerImage: { type: 'boolean' },
      }),
      responses: { '200': objectSchema({ channel: ref('Channel') }, ['channel']) },
    }),
  },
  '/api/bootstrap/home': {
    get: createOperation({
      operationId: 'getHomeBootstrap',
      summary: 'Get the home feed bootstrap payload',
      tags: ['bootstrap'],
      responses: {
        '200': objectSchema({
          viewer: ref('AuthUser'),
          page: objectSchema({
            items: arraySchema(ref('Video')),
            shorts: arraySchema(ref('Video')),
            categories: arraySchema({ type: 'string' }),
          }, ['items', 'shorts', 'categories']),
          pagination: ref('Pagination'),
          generatedAt: { type: 'string' },
        }, ['page', 'generatedAt']),
      },
    }),
  },
  '/api/bootstrap/trending': {
    get: createOperation({
      operationId: 'getTrendingBootstrap',
      summary: 'Get the trending feed bootstrap payload',
      tags: ['bootstrap'],
      responses: {
        '200': objectSchema({
          viewer: ref('AuthUser'),
          page: objectSchema({ items: arraySchema(ref('Video')) }, ['items']),
          pagination: ref('Pagination'),
          generatedAt: { type: 'string' },
        }, ['page', 'generatedAt']),
      },
    }),
  },
  '/api/bootstrap/shorts': {
    get: createOperation({
      operationId: 'getShortsBootstrap',
      summary: 'Get the Shorts feed bootstrap payload',
      tags: ['bootstrap'],
      responses: {
        '200': objectSchema({
          viewer: ref('AuthUser'),
          page: objectSchema({ items: arraySchema(ref('Video')) }, ['items']),
          pagination: ref('Pagination'),
          generatedAt: { type: 'string' },
        }, ['page', 'generatedAt']),
      },
    }),
  },
  '/api/bootstrap/watch/{videoId}': {
    get: createOperation({
      operationId: 'getWatchBootstrap',
      summary: 'Get the watch page bootstrap payload',
      tags: ['bootstrap'],
      params: { videoId: { type: 'string' } },
      query: { ref: { type: 'string' } },
      responses: {
        '200': objectSchema({
          viewer: ref('AuthUser'),
          page: objectSchema({
            video: ref('Video'),
            comments: arraySchema(ref('Comment')),
            suggestedVideos: arraySchema(ref('Video')),
          }, ['video', 'comments', 'suggestedVideos']),
          realtime: objectSchema({
            comments: ref('RealtimeScopeToken'),
          }),
          generatedAt: { type: 'string' },
        }, ['page', 'generatedAt']),
      },
    }),
  },
  '/api/bootstrap/channel/{channelId}': {
    get: createOperation({
      operationId: 'getChannelBootstrap',
      summary: 'Get the channel page bootstrap payload',
      tags: ['bootstrap'],
      params: { channelId: { type: 'string' } },
      responses: {
        '200': objectSchema({
          viewer: ref('AuthUser'),
          page: objectSchema({
            channel: ref('Channel'),
          }, ['channel']),
          realtime: objectSchema({
            channel: ref('RealtimeScopeToken'),
            postComments: objectSchema({}),
          }),
          generatedAt: { type: 'string' },
        }, ['page', 'generatedAt']),
      },
    }),
  },
  '/api/bootstrap/studio/{surface}': {
    get: createOperation({
      operationId: 'getStudioBootstrap',
      summary: 'Get the studio bootstrap payload for an authenticated surface',
      tags: ['bootstrap'],
      auth: true,
      params: { surface: { type: 'string' } },
      responses: {
        '200': objectSchema({
          viewer: ref('AuthUser'),
          page: objectSchema({
            surface: { type: 'string' },
          }, ['surface']),
          realtime: objectSchema({
            studio: ref('RealtimeScopeToken'),
          }),
          generatedAt: { type: 'string' },
        }, ['viewer', 'page', 'realtime', 'generatedAt']),
      },
    }),
  },
  '/api/channel/{channelId}': {
    get: createOperation({
      operationId: 'getPublicChannel',
      summary: 'Get a public channel by handle, @handle, or id',
      description:
        'Waslmedia prefers public handle URLs like /@handle, while legacy /channel/{channelId} routes remain supported for compatibility.',
      tags: ['channels'],
      params: { channelId: { type: 'string' } },
      responses: { '200': objectSchema({ channel: ref('Channel') }, ['channel']) },
    }),
  },
  '/api/videos': {
    get: createOperation({
      operationId: 'listVideos',
      summary: 'List public videos or user-specific video collections',
      tags: ['videos'],
      query: {
        authorId: { type: 'string' },
        mode: { type: 'string', enum: ['liked', 'watch-later', 'history', 'subscribed'] },
        ids: { type: 'string' },
        orderedIds: { type: 'string' },
        limit: { type: 'number' },
        offset: { type: 'number' },
        contentType: { type: 'string', enum: ['videos', 'shorts'] },
        sortBy: { type: 'string', enum: ['viewcount', 'rating', 'uploaddate', 'newest', 'oldest', 'most-viewed'] },
      },
      responses: {
        '200': objectSchema({
          items: arraySchema(ref('Video')),
          videos: arraySchema(ref('Video')),
          pagination: ref('Pagination'),
        }),
      },
    }),
    post: createOperation({
      operationId: 'createVideo',
      summary: 'Create a video record after media upload',
      tags: ['videos'],
      auth: true,
      requestBody: objectSchema({
        title: { type: 'string' },
        description: { type: 'string' },
        thumbnailUrl: { type: 'string' },
        videoUrl: { type: 'string' },
        sourceBucket: { type: 'string' },
        sourceObjectKey: { type: 'string' },
        duration: { type: 'number' },
        visibility: { type: 'string', enum: ['private', 'unlisted', 'public'] },
        audience: { type: 'string', enum: ['madeForKids', 'notMadeForKids'] },
        tags: arraySchema({ type: 'string' }),
        language: { type: 'string' },
        category: { type: 'string' },
        commentsEnabled: { type: 'boolean' },
        showLikes: { type: 'boolean' },
      }, ['title']),
      responses: { '201': objectSchema({ video: ref('Video') }, ['video']) },
    }),
  },
  '/api/videos/bulk': {
    patch: createOperation({
      operationId: 'bulkUpdateVideos',
      summary: 'Bulk update multiple videos',
      tags: ['videos'],
      auth: true,
      requestBody: objectSchema({
        videoIds: arraySchema({ type: 'string' }),
        updates: objectSchema({
          visibility: { type: 'string' },
          category: { type: 'string' },
        }),
      }, ['videoIds', 'updates']),
      responses: { '200': objectSchema({ ok: { type: 'boolean' } }, ['ok']) },
    }),
    delete: createOperation({
      operationId: 'bulkDeleteVideos',
      summary: 'Delete multiple videos',
      tags: ['videos'],
      auth: true,
      requestBody: objectSchema({
        videoIds: arraySchema({ type: 'string' }),
      }, ['videoIds']),
      responses: { '200': objectSchema({ ok: { type: 'boolean' } }, ['ok']) },
    }),
  },
  '/api/videos/{videoId}': {
    get: createOperation({
      operationId: 'getVideo',
      summary: 'Get a single video',
      tags: ['videos'],
      params: { videoId: { type: 'string' } },
      query: { share: { type: 'string' } },
      responses: { '200': objectSchema({ video: ref('Video') }, ['video']) },
    }),
    patch: createOperation({
      operationId: 'updateVideo',
      summary: 'Update a video',
      tags: ['videos'],
      auth: true,
      params: { videoId: { type: 'string' } },
      requestBody: objectSchema({
        title: { type: 'string' },
        description: { type: 'string' },
        visibility: { type: 'string' },
        audience: { type: 'string' },
        tags: arraySchema({ type: 'string' }),
        language: { type: 'string' },
        category: { type: 'string' },
        commentsEnabled: { type: 'boolean' },
        showLikes: { type: 'boolean' },
        thumbnailUrl: { type: 'string' },
      }),
      responses: { '200': objectSchema({ video: ref('Video') }, ['video']) },
    }),
    delete: createOperation({
      operationId: 'deleteVideo',
      summary: 'Delete a video',
      tags: ['videos'],
      auth: true,
      params: { videoId: { type: 'string' } },
      responses: { '200': objectSchema({ ok: { type: 'boolean' } }, ['ok']) },
    }),
  },
  '/api/videos/{videoId}/reaction': {
    post: createOperation({
      operationId: 'reactToVideo',
      summary: 'Like or dislike a video',
      tags: ['videos'],
      auth: true,
      params: { videoId: { type: 'string' } },
      requestBody: objectSchema({
        reaction: { type: 'string', enum: ['like', 'dislike'] },
      }, ['reaction']),
      responses: { '200': objectSchema({ status: objectSchema({
        liked: { type: 'boolean' },
        disliked: { type: 'boolean' },
        watchLater: { type: 'boolean' },
      }, ['liked', 'disliked', 'watchLater']) }, ['status']) },
    }),
  },
  '/api/videos/{videoId}/status': {
    get: createOperation({
      operationId: 'getVideoInteractionStatus',
      summary: 'Get viewer status for a video',
      tags: ['videos'],
      auth: true,
      params: { videoId: { type: 'string' } },
      responses: { '200': objectSchema({ status: objectSchema({
        liked: { type: 'boolean' },
        disliked: { type: 'boolean' },
        watchLater: { type: 'boolean' },
      }, ['liked', 'disliked', 'watchLater']) }, ['status']) },
    }),
  },
  '/api/videos/{videoId}/watch-later': {
    post: createOperation({
      operationId: 'toggleWatchLater',
      summary: 'Toggle watch later state for a video',
      tags: ['videos'],
      auth: true,
      params: { videoId: { type: 'string' } },
      responses: { '200': objectSchema({ watchLater: { type: 'boolean' } }, ['watchLater']) },
    }),
  },
  '/api/videos/watch-later/bulk': {
    post: createOperation({
      operationId: 'bulkWatchLater',
      summary: 'Bulk add or remove videos from watch later',
      tags: ['videos'],
      auth: true,
      requestBody: objectSchema({
        videoIds: arraySchema({ type: 'string' }),
        shouldExist: { type: 'boolean' },
      }, ['videoIds', 'shouldExist']),
      responses: { '200': objectSchema({ ok: { type: 'boolean' } }, ['ok']) },
    }),
  },
  '/api/videos/{videoId}/history': {
    post: createOperation({
      operationId: 'addHistoryEntry',
      summary: 'Add a watch history entry',
      tags: ['videos'],
      auth: true,
      params: { videoId: { type: 'string' } },
      responses: { '200': objectSchema({ ok: { type: 'boolean' } }, ['ok']) },
    }),
  },
  '/api/comments': {
    get: createOperation({
      operationId: 'listComments',
      summary: 'List comments for a video, post, or studio view',
      tags: ['comments'],
      query: {
        parentId: { type: 'string' },
        parentType: { type: 'string', enum: ['video', 'post'] },
        mode: { type: 'string', enum: ['studio'] },
        sortBy: { type: 'string', enum: ['createdAt', 'likes'] },
      },
      responses: { '200': objectSchema({ comments: arraySchema(ref('Comment')) }, ['comments']) },
    }),
    post: createOperation({
      operationId: 'createComment',
      summary: 'Create a comment or reply',
      tags: ['comments'],
      auth: true,
      requestBody: objectSchema({
        parentId: { type: 'string' },
        parentType: { type: 'string', enum: ['video', 'post'] },
        text: { type: 'string' },
        replyToCommentId: { type: 'string' },
      }, ['parentId', 'parentType', 'text']),
      responses: { '201': objectSchema({ comment: ref('Comment') }, ['comment']) },
    }),
  },
  '/api/comments/{commentId}': {
    patch: createOperation({
      operationId: 'updateComment',
      summary: 'Edit a comment',
      tags: ['comments'],
      auth: true,
      params: { commentId: { type: 'string' } },
      requestBody: objectSchema({ text: { type: 'string' } }, ['text']),
      responses: { '200': objectSchema({ comment: ref('Comment') }, ['comment']) },
    }),
    delete: createOperation({
      operationId: 'deleteComment',
      summary: 'Delete a comment',
      tags: ['comments'],
      auth: true,
      params: { commentId: { type: 'string' } },
      responses: { '200': objectSchema({ ok: { type: 'boolean' } }, ['ok']) },
    }),
  },
  '/api/comments/{commentId}/like': {
    post: createOperation({
      operationId: 'likeComment',
      summary: 'Toggle a like on a comment',
      tags: ['comments'],
      auth: true,
      params: { commentId: { type: 'string' } },
      responses: { '200': objectSchema({ liked: { type: 'boolean' }, comment: ref('Comment') }, ['liked']) },
    }),
  },
  '/api/playlists': {
    get: createOperation({
      operationId: 'listPlaylists',
      summary: 'List current user playlists',
      tags: ['playlists'],
      auth: true,
      responses: { '200': objectSchema({ playlists: arraySchema(ref('Playlist')) }, ['playlists']) },
    }),
    post: createOperation({
      operationId: 'createPlaylist',
      summary: 'Create a playlist',
      tags: ['playlists'],
      auth: true,
      requestBody: objectSchema({
        name: { type: 'string' },
        description: { type: 'string' },
        visibility: { type: 'string', enum: ['private', 'unlisted', 'public'] },
        firstVideoId: { type: 'string' },
      }, ['name', 'visibility']),
      responses: { '201': objectSchema({ playlist: ref('Playlist') }, ['playlist']) },
    }),
  },
  '/api/playlists/{playlistId}': {
    get: createOperation({
      operationId: 'getPlaylist',
      summary: 'Get a playlist with videos',
      tags: ['playlists'],
      params: { playlistId: { type: 'string' } },
      responses: { '200': objectSchema({ playlist: ref('Playlist') }, ['playlist']) },
    }),
    patch: createOperation({
      operationId: 'updatePlaylist',
      summary: 'Update a playlist',
      tags: ['playlists'],
      auth: true,
      params: { playlistId: { type: 'string' } },
      requestBody: objectSchema({
        name: { type: 'string' },
        description: { type: 'string' },
        visibility: { type: 'string', enum: ['private', 'unlisted', 'public'] },
      }),
      responses: { '200': objectSchema({ playlist: ref('Playlist') }, ['playlist']) },
    }),
    delete: createOperation({
      operationId: 'deletePlaylist',
      summary: 'Delete a playlist',
      tags: ['playlists'],
      auth: true,
      params: { playlistId: { type: 'string' } },
      responses: { '200': objectSchema({ ok: { type: 'boolean' } }, ['ok']) },
    }),
  },
  '/api/playlists/{playlistId}/videos': {
    post: createOperation({
      operationId: 'updatePlaylistVideos',
      summary: 'Add or remove one or more videos in a playlist',
      tags: ['playlists'],
      auth: true,
      params: { playlistId: { type: 'string' } },
      requestBody: objectSchema({
        videoId: { type: 'string' },
        videoIds: arraySchema({ type: 'string' }),
        isInPlaylist: { type: 'boolean' },
      }),
      responses: { '200': objectSchema({ playlist: ref('Playlist') }, ['playlist']) },
    }),
  },
  '/api/playlists/status': {
    get: createOperation({
      operationId: 'getPlaylistVideoStatus',
      summary: 'Get playlist ids containing a given video',
      tags: ['playlists'],
      auth: true,
      query: { videoId: { type: 'string' } },
      responses: { '200': objectSchema({ playlistIds: arraySchema({ type: 'string' }) }, ['playlistIds']) },
    }),
  },
  '/api/posts': {
    get: createOperation({
      operationId: 'listPosts',
      summary: 'List posts by author',
      tags: ['posts'],
      query: { authorId: { type: 'string' } },
      responses: { '200': objectSchema({ posts: arraySchema(ref('Post')) }, ['posts']) },
    }),
    post: createOperation({
      operationId: 'createPost',
      summary: 'Create a community post',
      tags: ['posts'],
      auth: true,
      requestBody: objectSchema({
        text: { type: 'string' },
        imageUrl: { type: 'string' },
        poll: objectSchema({
          question: { type: 'string' },
          options: arraySchema(ref('PollOption')),
        }),
      }, ['text']),
      responses: { '201': objectSchema({ post: ref('Post') }, ['post']) },
    }),
  },
  '/api/posts/{postId}': {
    delete: createOperation({
      operationId: 'deletePost',
      summary: 'Delete a post',
      tags: ['posts'],
      auth: true,
      params: { postId: { type: 'string' } },
      responses: { '200': objectSchema({ ok: { type: 'boolean' } }, ['ok']) },
    }),
  },
  '/api/posts/{postId}/reaction': {
    post: createOperation({
      operationId: 'reactToPost',
      summary: 'Like or dislike a post',
      tags: ['posts'],
      auth: true,
      params: { postId: { type: 'string' } },
      requestBody: objectSchema({ reaction: { type: 'string', enum: ['like', 'dislike'] } }, ['reaction']),
      responses: { '200': objectSchema({ status: objectSchema({
        liked: { type: 'boolean' },
        disliked: { type: 'boolean' },
      }, ['liked', 'disliked']) }, ['status']) },
    }),
  },
  '/api/posts/{postId}/status': {
    get: createOperation({
      operationId: 'getPostStatus',
      summary: 'Get viewer status for a post',
      tags: ['posts'],
      auth: true,
      params: { postId: { type: 'string' } },
      responses: { '200': objectSchema({ status: objectSchema({
        liked: { type: 'boolean' },
        disliked: { type: 'boolean' },
      }, ['liked', 'disliked']) }, ['status']) },
    }),
  },
  '/api/posts/{postId}/vote': {
    post: createOperation({
      operationId: 'voteOnPostPoll',
      summary: 'Vote on a post poll',
      tags: ['posts'],
      auth: true,
      params: { postId: { type: 'string' } },
      requestBody: objectSchema({ optionIndex: { type: 'number' } }, ['optionIndex']),
      responses: { '200': objectSchema({ post: ref('Post') }, ['post']) },
    }),
  },
  '/api/subscriptions': {
    get: createOperation({
      operationId: 'listSubscriptions',
      summary: 'Get subscribed channels, subscribed videos, or recent subscribers',
      tags: ['subscriptions'],
      auth: true,
      query: {
        mode: { type: 'string', enum: ['videos', 'recent'] },
        channelId: { type: 'string' },
        count: { type: 'number' },
      },
      responses: { '200': objectSchema({
        channels: arraySchema(ref('Channel')),
        videos: arraySchema(ref('Video')),
      }) },
    }),
  },
  '/api/subscriptions/{channelId}': {
    post: createOperation({
      operationId: 'toggleSubscription',
      summary: 'Subscribe or unsubscribe from a channel',
      tags: ['subscriptions'],
      auth: true,
      params: { channelId: { type: 'string' } },
      responses: { '200': objectSchema({ subscribed: { type: 'boolean' } }, ['subscribed']) },
    }),
  },
  '/api/upload-defaults': {
    get: createOperation({
      operationId: 'getUploadDefaults',
      summary: 'Get current user upload defaults',
      tags: ['studio'],
      auth: true,
      responses: { '200': objectSchema({ defaults: ref('UploadDefaults') }) },
    }),
    put: createOperation({
      operationId: 'updateUploadDefaults',
      summary: 'Update current user upload defaults',
      tags: ['studio'],
      auth: true,
      requestBody: ref('UploadDefaults'),
      responses: { '200': objectSchema({ defaults: ref('UploadDefaults') }, ['defaults']) },
    }),
  },
  '/api/audio-tracks': {
    get: createOperation({
      operationId: 'listAudioTracks',
      summary: 'List audio library tracks',
      tags: ['audio'],
      responses: { '200': objectSchema({ tracks: arraySchema(ref('AudioTrack')) }, ['tracks']) },
    }),
    post: createOperation({
      operationId: 'createAudioTrack',
      summary: 'Create an audio track',
      tags: ['audio'],
      auth: true,
      requestBody: objectSchema({
        title: { type: 'string' },
        artist: { type: 'string' },
        genre: { type: 'string' },
        duration: { type: 'number' },
        url: { type: 'string' },
      }, ['title', 'url']),
      responses: { '201': objectSchema({ track: ref('AudioTrack') }, ['track']) },
    }),
  },
  '/api/analytics/channel/{userId}': {
    get: createOperation({
      operationId: 'getChannelAnalytics',
      summary: 'Get dashboard analytics for a channel owner',
      tags: ['analytics'],
      auth: true,
      params: { userId: { type: 'string' } },
      responses: { '200': objectSchema({ analytics: ref('Analytics') }, ['analytics']) },
    }),
  },
  '/api/analytics/video/{videoId}': {
    get: createOperation({
      operationId: 'getVideoAnalytics',
      summary: 'Get detailed owner-only analytics for a single video or Short',
      tags: ['analytics'],
      auth: true,
      params: { videoId: { type: 'string' } },
      query: { days: { type: 'string' } },
      responses: {
        '200': objectSchema({
          analytics: objectSchema({
            video: ref('Video'),
            totals: objectSchema({
              views: { type: 'number' },
              likes: { type: 'number' },
              dislikes: { type: 'number' },
              comments: { type: 'number' },
              shares: { type: 'number' },
            }),
            rates: objectSchema({
              likeRate: { type: 'number' },
              dislikeRate: { type: 'number' },
              commentRate: { type: 'number' },
              shareRate: { type: 'number' },
              engagementRate: { type: 'number' },
            }),
          }, ['video', 'totals', 'rates']),
        }, ['analytics']),
      },
    }),
  },
  '/api/studio/feedback': {
    post: createOperation({
      operationId: 'submitStudioFeedback',
      summary: 'Submit authenticated feedback from Studio',
      tags: ['studio'],
      auth: true,
      requestBody: objectSchema({
        page: { type: 'string' },
        message: { type: 'string' },
        attachment: objectSchema({
          bucket: { type: 'string' },
          objectKey: { type: 'string' },
          storageRef: { type: 'string' },
          name: { type: 'string' },
          size: { type: 'number' },
          contentType: { type: 'string' },
        }),
      }, ['message']),
      responses: { '201': objectSchema({ ok: { type: 'boolean' } }, ['ok']) },
    }),
  },
  '/api/search': {
    get: createOperation({
      operationId: 'search',
      summary: 'Search videos and channels',
      tags: ['search'],
      query: {
        q: { type: 'string' },
        uploadDate: { type: 'string' },
        type: { type: 'string' },
        duration: { type: 'string' },
        sortBy: { type: 'string' },
      },
      responses: { '200': objectSchema({ results: arraySchema({ oneOf: [ref('Video'), ref('Channel')] }) }, ['results']) },
    }),
  },
  '/api/storage/upload-intent': {
    post: createOperation({
      operationId: 'createStorageUploadIntent',
      summary: 'Create a signed direct-upload intent',
      tags: ['storage'],
      auth: true,
      requestBody: objectSchema({
        bucket: { type: 'string' },
        objectKey: { type: 'string' },
        contentType: { type: 'string' },
      }, ['bucket', 'objectKey']),
      responses: {
        '200': objectSchema({
          token: { type: 'string' },
          bucket: { type: 'string' },
          objectKey: { type: 'string' },
          storageRef: { type: 'string' },
          upload: objectSchema({
            url: { type: 'string' },
            method: { type: 'string' },
            headers: objectSchema({}),
          }, ['url', 'method', 'headers']),
        }, ['token', 'bucket', 'objectKey', 'storageRef', 'upload']),
      },
    }),
  },
  '/api/storage/upload': {
    post: createOperation({
      operationId: 'signedStorageUpload',
      summary: 'Legacy server-mediated upload compatibility route',
      tags: ['storage'],
      auth: true,
      description: 'Prefer /api/storage/upload-intent for direct signed browser uploads. This route returns storage refs, not public URLs.',
      requestBody: objectSchema({
        token: { type: 'string' },
        file: { type: 'string', format: 'binary' },
      }, ['token', 'file']),
      responses: {
        '200': objectSchema({
          bucket: { type: 'string' },
          objectKey: { type: 'string' },
          storageRef: { type: 'string' },
        }, ['bucket', 'objectKey', 'storageRef']),
      },
    }),
  },
  '/api/storage/delete': {
    post: createOperation({
      operationId: 'deleteStorageObject',
      summary: 'Delete a MinIO object',
      tags: ['storage'],
      auth: true,
      requestBody: objectSchema({
        bucket: { type: 'string' },
        objectKey: { type: 'string' },
      }, ['bucket', 'objectKey']),
      responses: { '200': objectSchema({ ok: { type: 'boolean' } }, ['ok']) },
    }),
  },
  '/api/realtime': {
    get: createOperation({
      operationId: 'realtimeStream',
      summary: 'Open a server-sent events stream',
      tags: ['realtime'],
      query: {
        token: { type: 'string' },
        scope: { type: 'string' },
      },
      responses: {
        '200': {
          type: 'string',
          description: 'text/event-stream response',
        },
      },
    }),
  },
  '/api/realtime/token': {
    get: createOperation({
      operationId: 'issueRealtimeToken',
      summary: 'Issue a signed realtime scope token for an authorized owner scope',
      tags: ['realtime'],
      auth: true,
      query: {
        scope: { type: 'string' },
      },
      responses: {
        '200': objectSchema({
          scope: { type: 'string' },
          token: { type: 'string' },
        }, ['scope', 'token']),
      },
    }),
  },
  '/api/videos/{videoId}/share': {
    post: createOperation({
      operationId: 'shareVideo',
      summary: 'Record a share event for a video',
      tags: ['videos'],
      params: { videoId: { type: 'string' } },
      responses: { '200': objectSchema({ video: ref('Video') }, ['video']) },
    }),
  },
};

const ADMIN_ONLY_PATH_PREFIXES = [
  '/api/bootstrap/studio',
  '/api/channel/me',
  '/api/analytics/',
  '/api/studio/',
  '/api/upload-defaults',
];

const ADMIN_ONLY_EXACT_PATHS = new Set([
  '/api/realtime/token',
  '/api/storage/delete',
  '/api/storage/upload',
]);

function isPathVisibleForRole(path: string, role: AdminRole) {
  if (role === 'super_admin') {
    return true;
  }

  if (ADMIN_ONLY_EXACT_PATHS.has(path)) {
    return false;
  }

  return !ADMIN_ONLY_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function normalizeAccessList(values: string[] | undefined) {
  return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
}

function matchesDeveloperAccess(
  path: string,
  operations: Partial<Record<HttpMethod, ReturnType<typeof createOperation>>>,
  access: AdminDocsAccess | undefined
) {
  if (!access) {
    return true;
  }

  const allowedExactPaths = normalizeAccessList(access.allowedExactPaths);
  const allowedPathPrefixes = normalizeAccessList(access.allowedPathPrefixes);
  const allowedTags = normalizeAccessList(access.allowedTags);

  if (allowedExactPaths.length === 0 && allowedPathPrefixes.length === 0 && allowedTags.length === 0) {
    return true;
  }

  if (allowedExactPaths.includes(path)) {
    return true;
  }

  if (allowedPathPrefixes.some((prefix) => path.startsWith(prefix))) {
    return true;
  }

  const operationTags = new Set(
    Object.values(operations)
      .flatMap((operation) => operation?.tags ?? [])
      .map((tag) => tag.trim())
      .filter(Boolean)
  );

  return allowedTags.some((tag) => operationTags.has(tag));
}

export function getOpenApiDocument(options: { role?: AdminRole; developerAccess?: AdminDocsAccess } = {}) {
  const role = options.role ?? 'super_admin';
  const visiblePaths = Object.fromEntries(
    Object.entries(paths).filter(
      ([path, operations]) =>
        isPathVisibleForRole(path, role) && matchesDeveloperAccess(path, operations, role === 'developer' ? options.developerAccess : undefined)
    )
  );

  return {
    openapi: '3.1.0',
    info: {
      title: 'Waslmedia Internal API',
      version: '1.0.0',
      description:
        role === 'super_admin'
          ? 'Protected internal API documentation for Waslmedia administrators and platform maintainers.'
          : 'Protected API documentation for Waslmedia developers. Admin-only and internal operations are hidden in this view.',
    },
    tags: [
      { name: 'auth' },
      { name: 'channels' },
      { name: 'videos' },
      { name: 'comments' },
      { name: 'playlists' },
      { name: 'posts' },
      { name: 'subscriptions' },
      { name: 'studio' },
      { name: 'audio' },
      { name: 'analytics' },
      { name: 'search' },
      { name: 'storage' },
      { name: 'realtime' },
      { name: 'bootstrap' },
    ],
    components: {
      securitySchemes: {
        sessionCookie: {
          type: 'apiKey',
          in: 'cookie',
          name: 'waslmedia_session',
        },
      },
      schemas,
    },
    paths: visiblePaths,
  };
}
