import { getChannelAnalytics } from '@/server/services/analytics';
import { getAuthUserById } from '@/server/services/auth';
import { getOwnedVideoAnalytics } from '@/server/services/video-analytics';
import { decryptSecret, encryptSecret } from '@/server/utils/secret-box';
import { findStudioAiSettingsByUserId, upsertStudioAiSettings } from '@/server/repositories/studio-ai-settings';
import { buildChannelHref } from '@/lib/channel-links';
import { validateTrustedAiBaseUrl } from '@/server/utils/runtime-config';

type StudioAiProviderKind = 'gemini' | 'openai-compatible';
type StudioAiEndpointMode = 'chat-completions' | 'responses';

export interface StudioAiMessage {
  role: 'user' | 'assistant';
  content: string;
}

const baseStudioSystemPrompt =
  'You are the Waslmedia Studio assistant. Help creators understand analytics, content strategy, upload settings, Studio navigation, and channel performance clearly and practically. When concrete creator data is available in the provided context, use it directly and prefer exact numbers over generic advice. Always refer to the product as Waslmedia or Waslmedia Studio, never as YouTube or YouTube Studio unless the user explicitly asks for a comparison. If source labels resemble YouTube concepts, explain them using Waslmedia language instead of switching platform names. When you mention a URL, always output the full exact URL with its scheme like http:// or https://. If the creator channel URL is present in the provided context and the user asks for their channel link or URL, answer with that exact URL instead of inventing or generalizing it. If the user asks how to navigate, report something, or reach a page in Waslmedia, give step-by-step instructions and include the exact relevant Waslmedia URLs from the provided context when available. Never invent custom Waslmedia URL formats or features that are not present in the provided context.';

function normalizeText(value: string | null | undefined) {
  return value?.trim() || '';
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function getTrafficSourceSummary(items: Array<{ label: string; value: number }>) {
  return items
    .slice(0, 3)
    .map((item) => `${item.label}: ${item.value}`)
    .join(', ');
}

function getCountrySummary(items: Array<{ label: string; value: number }>) {
  return items
    .slice(0, 3)
    .map((item) => `${item.label}: ${item.value}`)
    .join(', ');
}

function describeStudioPath(path: string | null | undefined) {
  if (!path) {
    return 'Studio';
  }

  if (/^\/studio\/dashboard/.test(path)) return 'Studio dashboard';
  if (/^\/studio\/upload/.test(path)) return 'Studio content';
  if (/^\/studio\/analytics/.test(path)) return 'Studio channel analytics';
  if (/^\/studio\/video\/[^/]+\/analytics/.test(path)) return 'Studio specific video analytics';
  if (/^\/studio\/video\/[^/]+\/details/.test(path)) return 'Studio video details';
  if (/^\/studio\/video\/[^/]+/.test(path)) return 'Studio video workspace';
  if (/^\/studio\/community/.test(path)) return 'Studio community';
  if (/^\/studio\/customisation/.test(path)) return 'Studio customization';
  if (/^\/studio\/library/.test(path)) return 'Studio audio library';
  if (/^\/studio\/settings/.test(path)) return 'Studio settings';
  if (/^\/studio\/feedback/.test(path)) return 'Studio feedback';
  if (/^\/studio\/help/.test(path)) return 'Studio help';
  return 'Studio';
}

function parseVideoIdFromPath(path: string | null | undefined) {
  if (!path) {
    return null;
  }

  const match = path.match(/\/studio\/video\/([^/]+)/);
  return match?.[1] || null;
}

async function buildStudioAssistantContext(input: {
  userId: string;
  pagePath?: string | null;
  pageOrigin?: string | null;
}) {
  const currentPage = describeStudioPath(input.pagePath);
  const videoId = parseVideoIdFromPath(input.pagePath);
  const pageOrigin = normalizeText(input.pageOrigin) || 'http://localhost:9002';

  try {
    const [authUser, channelAnalytics, currentVideoAnalytics] = await Promise.all([
      getAuthUserById(input.userId),
      getChannelAnalytics(input.userId, 28),
      videoId ? getOwnedVideoAnalytics(input.userId, videoId, 28) : Promise.resolve(null),
    ]);

    const latestDay = channelAnalytics.dailyMetrics.at(-1);
    const yesterday = channelAnalytics.dailyMetrics.at(-2);
    const topTrafficSources = getTrafficSourceSummary(channelAnalytics.trafficSources);
    const topViewerCountries = getCountrySummary(channelAnalytics.viewerCountries);
    const topSubscriberCountries = getCountrySummary(channelAnalytics.subscriberCountries);
    const topVideo = channelAnalytics.videos[0];

    const sections = [
      'Dashboard',
      'Content',
      'Analytics',
      'Community',
      'Customization',
      'Audio library',
      'Settings',
      'Feedback',
      'Help',
    ].join(', ');

    const appNav = [
      'Home',
      'Shorts',
      'Subscriptions',
      'Search',
      'Watch',
      'Channel pages',
      'History',
      'Liked videos',
      'Watch later',
      'Studio',
    ].join(', ');

    const appLinks = [
      `Home: ${pageOrigin}/`,
      `Shorts: ${pageOrigin}/shorts`,
      `Search: ${pageOrigin}/search`,
      `History: ${pageOrigin}/history`,
      `Liked videos: ${pageOrigin}/liked`,
      `Watch later: ${pageOrigin}/watch-later`,
      `Subscriptions: ${pageOrigin}/subscriptions`,
      `Studio home: ${pageOrigin}/studio`,
      `Studio content: ${pageOrigin}/studio/upload`,
      `Studio analytics: ${pageOrigin}/studio/analytics`,
      `Studio customization: ${pageOrigin}/studio/customisation`,
      `Studio community: ${pageOrigin}/studio/community`,
      `Studio feedback/report page: ${pageOrigin}/studio/feedback`,
      `Studio settings: ${pageOrigin}/studio/settings`,
    ].join(' | ');

    const lines = [
      'Waslmedia Studio context for this creator:',
      `Current page: ${currentPage}`,
      `Studio sections available: ${sections}`,
      `Main Waslmedia app navigation: ${appNav}`,
      `Useful Waslmedia URLs: ${appLinks}`,
      authUser ? `Creator: ${authUser.displayName} (${authUser.handle})` : null,
      authUser?.handle ? `Creator channel URL: ${pageOrigin}${buildChannelHref(authUser.handle)}` : null,
      `Current subscribers: ${channelAnalytics.totalSubscribers}`,
      `Total channel views: ${channelAnalytics.totalViews}`,
      `Channel videos: ${channelAnalytics.totalVideos}`,
      `Views in last 28 days: ${channelAnalytics.dailyMetrics.reduce((sum, point) => sum + point.views, 0)}`,
      `Views in last 48 hours: ${channelAnalytics.viewsLast48Hours}`,
      `Unique viewers in last 28 days: ${channelAnalytics.uniqueViewers}`,
      `Returning viewers in last 28 days: ${channelAnalytics.returningViewers}`,
      yesterday ? `Yesterday channel views: ${yesterday.views}` : null,
      latestDay ? `Today/latest tracked day channel views: ${latestDay.views}` : null,
      topTrafficSources ? `Top traffic sources: ${topTrafficSources}` : null,
      topViewerCountries ? `Top viewer countries: ${topViewerCountries}` : null,
      topSubscriberCountries ? `Top subscriber countries: ${topSubscriberCountries}` : null,
      topVideo ? `Most recent top-listed video in analytics data: ${topVideo.title} with ${topVideo.viewCount} views` : null,
    ];

    if (currentVideoAnalytics) {
      const videoYesterday = currentVideoAnalytics.dailyMetrics.at(-2);
      const videoLatest = currentVideoAnalytics.dailyMetrics.at(-1);
      lines.push(
        `Current video context: ${currentVideoAnalytics.video.title}`,
        `Current video total views: ${currentVideoAnalytics.totals.views}`,
        `Current video likes: ${currentVideoAnalytics.totals.likes}`,
        `Current video comments: ${currentVideoAnalytics.totals.comments}`,
        `Current video shares: ${currentVideoAnalytics.totals.shares}`,
        `Current video unique viewers: ${currentVideoAnalytics.uniqueViewers}`,
        `Current video returning viewers: ${currentVideoAnalytics.returningViewers}`,
        videoYesterday ? `Yesterday current-video views: ${videoYesterday.views}` : null,
        videoLatest ? `Today/latest tracked day current-video views: ${videoLatest.views}` : null,
        currentVideoAnalytics.trafficSources.length
          ? `Current video traffic sources: ${getTrafficSourceSummary(currentVideoAnalytics.trafficSources)}`
          : null,
        currentVideoAnalytics.viewerCountries.length
          ? `Current video viewer countries: ${getCountrySummary(currentVideoAnalytics.viewerCountries)}`
          : null,
      );
    }

    return lines.filter(Boolean).join('\n');
  } catch {
    return [
      'Waslmedia Studio context:',
      `Current page: ${currentPage}`,
      'Studio sections available: Dashboard, Content, Analytics, Community, Customization, Audio library, Settings, Feedback, Help.',
      'Main Waslmedia app navigation: Home, Shorts, Subscriptions, Search, Watch, Channel pages, History, Liked videos, Watch later, Studio.',
      `Useful Waslmedia URLs: Home ${pageOrigin}/ | Shorts ${pageOrigin}/shorts | Search ${pageOrigin}/search | Studio ${pageOrigin}/studio | Studio analytics ${pageOrigin}/studio/analytics | Studio feedback/report page ${pageOrigin}/studio/feedback`,
      'If analytics data is unavailable, explain that the live creator metrics could not be loaded right now instead of inventing numbers.',
    ].join('\n');
  }
}

function looksLikeEmbeddingModel(model: string) {
  const normalized = model.toLowerCase();
  return normalized.includes('embed') || normalized.includes('embedding');
}

function maskApiKey(value: string) {
  if (value.length <= 8) {
    return `${value.slice(0, 2)}••••`;
  }

  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

function buildGeminiPayload(messages: StudioAiMessage[], systemInstruction: string) {
  return {
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    contents: messages.map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    })),
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      maxOutputTokens: 1024,
    },
  };
}

function buildOpenAiMessages(messages: StudioAiMessage[], systemInstruction: string) {
  return [
    {
      role: 'system',
      content: systemInstruction,
    },
    ...messages,
  ];
}

function buildOpenAiResponsesInput(messages: StudioAiMessage[], systemInstruction: string) {
  return buildOpenAiMessages(messages, systemInstruction).map((message) => ({
    role: message.role,
    content: [{ type: 'input_text', text: message.content }],
  }));
}

function extractTextValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }

        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>;
          if (typeof record.text === 'string') {
            return record.text;
          }

          if (typeof record.output_text === 'string') {
            return record.output_text;
          }
        }

        return '';
      })
      .join('');
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;

    if (typeof record.text === 'string') {
      return record.text;
    }

    if (typeof record.output_text === 'string') {
      return record.output_text;
    }

    if (Array.isArray(record.content)) {
      return extractTextValue(record.content);
    }
  }

  return '';
}

function extractOpenAiCompatibleText(payload: any) {
  const candidates = [
    normalizeText(payload?.output_text),
    normalizeText(payload?.choices?.[0]?.message?.content),
    normalizeText(payload?.choices?.[0]?.text),
    normalizeText(extractTextValue(payload?.choices?.[0]?.message?.content)),
    normalizeText(extractTextValue(payload?.output)),
    normalizeText(extractTextValue(payload?.content)),
    normalizeText(extractTextValue(payload?.response)),
  ].filter(Boolean);

  return candidates[0] || '';
}

function extractOpenAiCompatibleDelta(payload: any) {
  const candidates = [
    payload?.choices?.[0]?.delta?.content,
    extractTextValue(payload?.choices?.[0]?.delta?.content),
    payload?.delta,
    payload?.output_text?.delta,
    extractTextValue(payload?.output?.[0]?.content),
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.length > 0) {
      return candidate;
    }
  }

  return '';
}

function providerErrorFromPayload(payload: any) {
  return normalizeText(payload?.error?.message) || normalizeText(payload?.message);
}

function validateChatCapableModel(model: string) {
  if (looksLikeEmbeddingModel(model)) {
    throw new Error('INVALID_AI_CHAT_MODEL');
  }
}

async function requestGeminiCompletion(input: {
  apiKey: string;
  model: string;
  messages: StudioAiMessage[];
  systemInstruction: string;
}) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    input.model
  )}:generateContent?key=${encodeURIComponent(input.apiKey)}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildGeminiPayload(input.messages, input.systemInstruction)),
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(providerErrorFromPayload(payload) || 'AI_PROVIDER_REQUEST_FAILED');
  }

  const text =
    payload?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text || '')
      .join('')
      .trim() || '';

  if (!text) {
    throw new Error('AI_EMPTY_RESPONSE');
  }

  return text;
}

async function requestOpenAiCompatibleCompletion(input: {
  apiKey: string;
  baseUrl: string;
  model: string;
  messages: StudioAiMessage[];
  endpointMode: StudioAiEndpointMode;
  systemInstruction: string;
}) {
  const endpoint =
    input.endpointMode === 'responses'
      ? `${input.baseUrl.replace(/\/$/, '')}/responses`
      : `${input.baseUrl.replace(/\/$/, '')}/chat/completions`;

  const body =
    input.endpointMode === 'responses'
      ? {
          model: input.model,
          input: buildOpenAiResponsesInput(input.messages, input.systemInstruction),
          temperature: 0.7,
          max_output_tokens: 1024,
        }
      : {
          model: input.model,
          messages: buildOpenAiMessages(input.messages, input.systemInstruction),
          temperature: 0.7,
          max_tokens: 1024,
        };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${input.apiKey}`,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const providerMessage = providerErrorFromPayload(payload);

    if (/embedding model|\/embeddings endpoint/i.test(providerMessage)) {
      throw new Error('INVALID_AI_CHAT_MODEL');
    }

    throw new Error(providerMessage || 'AI_PROVIDER_REQUEST_FAILED');
  }

  const text = extractOpenAiCompatibleText(payload);
  if (!text) {
    throw new Error('AI_EMPTY_RESPONSE');
  }

  return text;
}

function createTextStream(asyncIteratorFactory: () => AsyncGenerator<string, void, void>) {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of asyncIteratorFactory()) {
          if (!chunk) {
            continue;
          }

          controller.enqueue(encoder.encode(chunk));
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

async function tryResolveDirectStudioAnswer(input: {
  userId: string;
  messages: StudioAiMessage[];
  pageOrigin?: string | null;
}) {
  const latestUserMessage = [...input.messages]
    .reverse()
    .find((message) => message.role === 'user' && normalizeText(message.content));

  const latestPrompt = normalizeText(latestUserMessage?.content).toLowerCase();
  if (!latestPrompt) {
    return null;
  }

  const asksForChannelLink =
    /(?:what(?:'s| is)|show|give|tell).*(?:my )?channel (?:url|link)/i.test(latestPrompt) ||
    /(?:my )?channel (?:url|link)/i.test(latestPrompt);

  if (!asksForChannelLink) {
    return null;
  }

  const authUser = await getAuthUserById(input.userId);
  if (!authUser?.handle) {
    return null;
  }

  const pageOrigin = normalizeText(input.pageOrigin) || 'http://localhost:9002';
  const preferredUrl = `${pageOrigin}${buildChannelHref(authUser.handle)}`;

  return [
    '## Your Waslmedia channel link',
    '',
    `[${preferredUrl}](${preferredUrl})`,
    '',
    `- Handle: \`${authUser.handle}\``,
    '- Preferred format: handle-based channel URL',
    '- Legacy `/channel/@handle` and `/channel/<id>` links still work, but Waslmedia now defaults to the handle URL.',
  ].join('\n');
}

async function* streamGeminiCompletion(input: {
  apiKey: string;
  model: string;
  messages: StudioAiMessage[];
  systemInstruction: string;
}) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    input.model
  )}:streamGenerateContent?alt=sse&key=${encodeURIComponent(input.apiKey)}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildGeminiPayload(input.messages, input.systemInstruction)),
    cache: 'no-store',
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(providerErrorFromPayload(payload) || 'AI_PROVIDER_REQUEST_FAILED');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('AI_EMPTY_RESPONSE');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let emitted = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split('\n\n');
    buffer = frames.pop() || '';

    for (const frame of frames) {
      const lines = frame
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith('data:'));

      for (const line of lines) {
        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') {
          continue;
        }

        const payload = JSON.parse(data);
        const delta =
          payload?.candidates?.[0]?.content?.parts
            ?.map((part: { text?: string }) => part.text || '')
            .join('') || '';

        if (delta) {
          emitted = true;
          yield delta;
        }
      }
    }
  }

  if (!emitted) {
    throw new Error('AI_EMPTY_RESPONSE');
  }
}

async function* streamOpenAiCompatibleCompletion(input: {
  apiKey: string;
  baseUrl: string;
  model: string;
  messages: StudioAiMessage[];
  endpointMode: StudioAiEndpointMode;
  systemInstruction: string;
}) {
  const endpoint =
    input.endpointMode === 'responses'
      ? `${input.baseUrl.replace(/\/$/, '')}/responses`
      : `${input.baseUrl.replace(/\/$/, '')}/chat/completions`;

  const body =
    input.endpointMode === 'responses'
      ? {
          model: input.model,
          input: buildOpenAiResponsesInput(input.messages, input.systemInstruction),
          temperature: 0.7,
          max_output_tokens: 1024,
          stream: true,
        }
      : {
          model: input.model,
          messages: buildOpenAiMessages(input.messages, input.systemInstruction),
          temperature: 0.7,
          max_tokens: 1024,
          stream: true,
        };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${input.apiKey}`,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const providerMessage = providerErrorFromPayload(payload);

    if (/embedding model|\/embeddings endpoint/i.test(providerMessage)) {
      throw new Error('INVALID_AI_CHAT_MODEL');
    }

    throw new Error(providerMessage || 'AI_PROVIDER_REQUEST_FAILED');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('AI_EMPTY_RESPONSE');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let emitted = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split('\n\n');
    buffer = frames.pop() || '';

    for (const frame of frames) {
      const lines = frame
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith('data:'));

      for (const line of lines) {
        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') {
          continue;
        }

        const payload = JSON.parse(data);
        const delta = extractOpenAiCompatibleDelta(payload);

        if (delta) {
          emitted = true;
          yield delta;
        }
      }
    }
  }

  if (!emitted) {
    throw new Error('AI_EMPTY_RESPONSE');
  }
}

export async function getStudioAiSettings(userId: string) {
  const row = await findStudioAiSettingsByUserId(userId);
  if (!row) {
    return null;
  }

  const hasApiKey = Boolean(row.encrypted_api_key);
  const decryptedKey = hasApiKey ? decryptSecret(row.encrypted_api_key) : '';
  return {
    providerKind: row.provider_kind as StudioAiProviderKind,
    providerLabel: row.provider_label,
    baseUrl: row.base_url,
    model: row.model,
    endpointMode: (row.endpoint_mode || 'chat-completions') as StudioAiEndpointMode,
    streamEnabled: row.stream_enabled === undefined || row.stream_enabled === null ? true : Boolean(row.stream_enabled),
    maskedApiKey: hasApiKey ? maskApiKey(decryptedKey) : '',
    hasApiKey,
  };
}

export async function saveStudioAiSettings(input: {
  userId: string;
  providerKind?: StudioAiProviderKind;
  providerLabel?: string;
  baseUrl?: string | null;
  model?: string;
  apiKey?: string;
  endpointMode?: StudioAiEndpointMode;
  streamEnabled?: boolean;
  clearApiKey?: boolean;
}) {
  const existing = await findStudioAiSettingsByUserId(input.userId);
  const providerKind = input.providerKind || (existing?.provider_kind as StudioAiProviderKind | undefined);
  const providerLabel = normalizeText(input.providerLabel) || existing?.provider_label || '';
  const model = normalizeText(input.model) || existing?.model || '';
  const apiKey = normalizeText(input.apiKey);
  const rawBaseUrl =
    input.baseUrl === undefined ? normalizeText(existing?.base_url) : normalizeText(input.baseUrl);
  const endpointMode =
    input.endpointMode || ((existing?.endpoint_mode as StudioAiEndpointMode | undefined) ?? 'chat-completions');
  const streamEnabled = input.streamEnabled ?? (existing ? Boolean(existing.stream_enabled) : true);
  const clearApiKey = Boolean(input.clearApiKey);

  if (!providerKind) {
    throw new Error('INVALID_AI_PROVIDER');
  }

  if (!providerLabel || providerLabel.length > 120) {
    throw new Error('INVALID_AI_PROVIDER_LABEL');
  }

  if (!model || model.length > 191) {
    throw new Error('INVALID_AI_MODEL');
  }

  validateChatCapableModel(model);

  const providerChanged = Boolean(existing && providerKind !== existing.provider_kind);

  if ((!existing || providerChanged) && !clearApiKey && (!apiKey || apiKey.length < 8)) {
    throw new Error('INVALID_AI_API_KEY');
  }

  if (apiKey && apiKey.length < 8) {
    throw new Error('INVALID_AI_API_KEY');
  }

  if (providerKind === 'openai-compatible' && !rawBaseUrl) {
    throw new Error('INVALID_AI_BASE_URL');
  }
  const baseUrl = rawBaseUrl ? validateTrustedAiBaseUrl(rawBaseUrl) : '';

  const encryptedApiKey = clearApiKey
    ? ''
    : apiKey
      ? encryptSecret(apiKey)
      : existing?.encrypted_api_key || '';

  if (!clearApiKey && !encryptedApiKey) {
    throw new Error('INVALID_AI_API_KEY');
  }

  const saved = await upsertStudioAiSettings({
    userId: input.userId,
    providerKind,
    providerLabel,
    baseUrl: baseUrl || null,
    model,
    endpointMode,
    streamEnabled,
    encryptedApiKey,
  });

  if (!saved) {
    throw new Error('AI_SETTINGS_SAVE_FAILED');
  }

  return getStudioAiSettings(input.userId);
}

export async function sendStudioAiChat(input: {
  userId: string;
  messages: StudioAiMessage[];
  pagePath?: string | null;
  pageOrigin?: string | null;
}) {
  const directAnswer = await tryResolveDirectStudioAnswer(input);
  if (directAnswer) {
    return directAnswer;
  }

  const row = await findStudioAiSettingsByUserId(input.userId);
  if (!row) {
    throw new Error('AI_SETTINGS_REQUIRED');
  }

  const messages = input.messages
    .map((message) => ({
      role: message.role,
      content: normalizeText(message.content),
    }))
    .filter((message) => message.content.length > 0)
    .slice(-12);

  if (messages.length === 0) {
    throw new Error('INVALID_AI_MESSAGES');
  }

  if (!row.encrypted_api_key) {
    throw new Error('AI_SETTINGS_REQUIRED');
  }

  const apiKey = decryptSecret(row.encrypted_api_key);
  validateChatCapableModel(row.model);
  const context = await buildStudioAssistantContext({
    userId: input.userId,
    pagePath: input.pagePath,
    pageOrigin: input.pageOrigin,
  });
  const systemInstruction = `${baseStudioSystemPrompt}\n\n${context}`;

  if (row.provider_kind === 'gemini') {
    return requestGeminiCompletion({
      apiKey,
      model: row.model,
      messages,
      systemInstruction,
    });
  }

  return requestOpenAiCompatibleCompletion({
    apiKey,
    baseUrl: row.base_url || '',
    model: row.model,
    messages,
    endpointMode: (row.endpoint_mode || 'chat-completions') as StudioAiEndpointMode,
    systemInstruction,
  });
}

export async function streamStudioAiChat(input: {
  userId: string;
  messages: StudioAiMessage[];
  pagePath?: string | null;
  pageOrigin?: string | null;
}) {
  const directAnswer = await tryResolveDirectStudioAnswer(input);
  if (directAnswer) {
    return createTextStream(async function* () {
      yield directAnswer;
    });
  }

  const row = await findStudioAiSettingsByUserId(input.userId);
  if (!row) {
    throw new Error('AI_SETTINGS_REQUIRED');
  }

  const messages = input.messages
    .map((message) => ({
      role: message.role,
      content: normalizeText(message.content),
    }))
    .filter((message) => message.content.length > 0)
    .slice(-12);

  if (messages.length === 0) {
    throw new Error('INVALID_AI_MESSAGES');
  }

  if (!row.encrypted_api_key) {
    throw new Error('AI_SETTINGS_REQUIRED');
  }

  const apiKey = decryptSecret(row.encrypted_api_key);
  validateChatCapableModel(row.model);
  const context = await buildStudioAssistantContext({
    userId: input.userId,
    pagePath: input.pagePath,
    pageOrigin: input.pageOrigin,
  });
  const systemInstruction = `${baseStudioSystemPrompt}\n\n${context}`;

  if (row.provider_kind === 'gemini') {
    return createTextStream(async function* () {
      yield* streamGeminiCompletion({
        apiKey,
        model: row.model,
        messages,
        systemInstruction,
      });
    });
  }

  return createTextStream(async function* () {
    yield* streamOpenAiCompatibleCompletion({
      apiKey,
      baseUrl: row.base_url || '',
      model: row.model,
      messages,
      endpointMode: (row.endpoint_mode || 'chat-completions') as StudioAiEndpointMode,
      systemInstruction,
    });
  });
}
