'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { ArrowDown, ImagePlus, KeyRound, Loader2, Save, Send, StopCircle, Trash2, X } from 'lucide-react';
import { apiGet, apiSend } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';
import { useStudioAiStore } from '@/hooks/use-studio-ai-store';
import { cn } from '@/lib/utils';
import { appConfig } from '@/config/app';

type ProviderKind = 'gemini' | 'openai-compatible';
type EndpointMode = 'chat-completions' | 'responses';

interface StudioAiSettings {
  providerKind: ProviderKind;
  providerLabel: string;
  baseUrl: string | null;
  model: string;
  endpointMode: EndpointMode;
  streamEnabled: boolean;
  maskedApiKey: string;
  hasApiKey: boolean;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const defaultGeminiModel = 'gemini-2.0-flash';
const defaultOpenAiModel = 'deepseek-chat';
const defaultOpenAiBaseUrl = 'https://api.deepseek.com/v1';
const DESKTOP_WIDTH = 420;
const DESKTOP_HEIGHT = 640;
const STREAM_WORD_DELAY_MS = 10;
const SETTINGS_LOAD_TIMEOUT_MS = 12000;

function StudioAiIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <Image
      src={appConfig.aiIconUrl}
      alt="Waslmedia AI"
      width={size}
      height={size}
      className={cn('rounded-xl object-contain', className)}
    />
  );
}

function tokenizeForTyping(value: string) {
  return value.match(/[^\s]+\s*|\s+/g) || [value];
}

function clampPosition(x: number, y: number) {
  if (typeof window === 'undefined') {
    return { x, y };
  }

  const maxX = Math.max(16, window.innerWidth - DESKTOP_WIDTH - 16);
  const maxY = Math.max(16, window.innerHeight - DESKTOP_HEIGHT - 16);

  return {
    x: Math.min(Math.max(16, x), maxX),
    y: Math.min(Math.max(16, y), maxY),
  };
}

function EmptyAssistantState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3 px-6 text-center">
      <StudioAiIcon size={28} />
      <div className="space-y-1">
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
        <p className="max-w-sm text-xs leading-5 text-muted-foreground/80">
          Your chat stays only in this browser session. Messages are not saved to the Waslmedia database.
        </p>
      </div>
    </div>
  );
}

function renderInlineAssistantText(value: string) {
  const domainPattern =
    '(?:(?:https?:\\/\\/)?(?:localhost:\\d+|(?:[a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,})(?:\\/[^\\s<>()]*)?)';
  const tokenPattern =
    new RegExp(
      '(\\[[^\\]]+\\]\\((?:https?:\\/\\/[^\\s)]+)\\)|' +
        domainPattern +
        '|\\*\\*\\*[^*]+\\*\\*\\*|\\*\\*[^*]+\\*\\*|(?<!\\*)\\*[^*]+\\*(?!\\*)|`[^`]+`)',
      'g'
    );
  const parts = value.split(tokenPattern).filter(Boolean);

  return parts.map((part, index) => {
    const linkMatch = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={`${part}-${index}`}
          href={linkMatch[2]}
          target="_blank"
          rel="noreferrer"
          className="cursor-pointer break-all font-semibold text-blue-600 underline decoration-blue-400 underline-offset-4 transition-colors hover:text-blue-700 dark:text-sky-400 dark:decoration-sky-400/80 dark:hover:text-sky-300"
        >
          {linkMatch[1]}
        </a>
      );
    }

    if (new RegExp(`^${domainPattern}$`).test(part)) {
      const punctuationMatch = part.match(/[),.;!?]+$/);
      const trailingPunctuation = punctuationMatch?.[0] || '';
      const normalizedLink = trailingPunctuation ? part.slice(0, -trailingPunctuation.length) : part;
      const href = /^https?:\/\//.test(normalizedLink)
        ? normalizedLink
        : normalizedLink.startsWith('localhost:')
          ? `http://${normalizedLink}`
          : `https://${normalizedLink}`;

      return (
        <span key={`${part}-${index}`}>
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="cursor-pointer break-all font-semibold text-blue-600 underline decoration-blue-400 underline-offset-4 transition-colors hover:text-blue-700 dark:text-sky-400 dark:decoration-sky-400/80 dark:hover:text-sky-300"
          >
            {normalizedLink}
          </a>
          {trailingPunctuation}
        </span>
      );
    }

    if (part.startsWith('***') && part.endsWith('***')) {
      return (
        <strong key={`${part}-${index}`} className="font-semibold italic text-foreground">
          {part.slice(3, -3)}
        </strong>
      );
    }

    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={`${part}-${index}`} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (
      part.startsWith('*') &&
      part.endsWith('*') &&
      !part.startsWith('**') &&
      !part.endsWith('**')
    ) {
      return (
        <em key={`${part}-${index}`} className="italic text-foreground">
          {part.slice(1, -1)}
        </em>
      );
    }

    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={`${part}-${index}`}
          className="rounded-md bg-background/80 px-1.5 py-0.5 font-mono text-[0.92em] text-foreground"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function renderAssistantMessage(content: string) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (/^#{1,4}\s+/.test(trimmed)) {
      const level = Math.min(Number(trimmed.match(/^#+/)?.[0].length || 1), 4);
      const headingText = trimmed.replace(/^#{1,4}\s+/, '');
      blocks.push(
        <p
          key={`heading-${index}`}
          className={cn(
            'tracking-tight text-foreground',
            level === 1 && 'text-base font-semibold',
            level === 2 && 'text-[15px] font-semibold',
            level === 3 && 'text-sm font-semibold uppercase text-foreground/90',
            level === 4 && 'text-sm font-medium text-foreground/85'
          )}
        >
          {renderInlineAssistantText(headingText)}
        </p>
      );
      index += 1;
      continue;
    }

    if (/^---+$/.test(trimmed) || /^\*\*\*+$/.test(trimmed)) {
      blocks.push(<div key={`divider-${index}`} className="my-1 h-px w-full bg-border/70" />);
      index += 1;
      continue;
    }

    if (/^>\s+/.test(trimmed)) {
      const quoteLines: string[] = [];

      while (index < lines.length) {
        const nextLine = lines[index]?.trim() || '';
        if (!nextLine || !/^>\s+/.test(nextLine)) {
          break;
        }
        quoteLines.push(nextLine.replace(/^>\s+/, ''));
        index += 1;
      }

      blocks.push(
        <blockquote
          key={`quote-${index}`}
          className="rounded-2xl border border-sky-400/20 bg-sky-400/5 px-4 py-3 text-sm leading-6 text-foreground/90"
        >
          <div className="space-y-1.5">
            {quoteLines.map((quoteLine, quoteIndex) => (
              <p key={`quote-line-${index}-${quoteIndex}`}>{renderInlineAssistantText(quoteLine)}</p>
            ))}
          </div>
        </blockquote>
      );
      continue;
    }

    if (/^(\-|\*|\d+\.|\[[ xX]\])\s+/.test(trimmed)) {
      const listLines: string[] = [];
      const ordered = /^\d+\.\s+/.test(trimmed);
      const checklist = /^\[[ xX]\]\s+/.test(trimmed);

      while (index < lines.length) {
        const nextLine = lines[index]?.trim() || '';
        if (!nextLine || !/^(\-|\*|\d+\.|\[[ xX]\])\s+/.test(nextLine)) {
          break;
        }
        listLines.push(nextLine);
        index += 1;
      }

      if (checklist) {
        blocks.push(
          <div key={`checklist-${index}`} className="space-y-2">
            {listLines.map((listLine, listIndex) => {
              const checked = /^\[[xX]\]\s+/.test(listLine);
              const label = listLine.replace(/^\[[ xX]\]\s+/, '');
              return (
                <div
                  key={`check-${index}-${listIndex}`}
                  className="flex items-start gap-3 rounded-xl border border-border/60 bg-secondary/30 px-3 py-2.5"
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[11px] font-semibold',
                      checked
                        ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'border-border/80 bg-background text-muted-foreground'
                    )}
                  >
                    {checked ? '✓' : ''}
                  </span>
                  <div className="text-sm leading-6 text-foreground">{renderInlineAssistantText(label)}</div>
                </div>
              );
            })}
          </div>
        );
      } else {
        const ListTag = ordered ? 'ol' : 'ul';
        blocks.push(
          <ListTag
            key={`list-${index}`}
            className={cn(
              'space-y-2.5 pl-5 text-sm leading-6 marker:text-primary',
              ordered ? 'list-decimal' : 'list-disc'
            )}
          >
            {listLines.map((listLine, listIndex) => (
              <li key={`item-${index}-${listIndex}`} className="pl-1 text-foreground">
                {renderInlineAssistantText(listLine.replace(/^(\-|\*|\d+\.)\s+/, ''))}
              </li>
            ))}
          </ListTag>
        );
      }
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const nextLine = lines[index];
      const nextTrimmed = nextLine.trim();
      if (
        !nextTrimmed ||
        /^#{1,4}\s+/.test(nextTrimmed) ||
        /^(\-|\*|\d+\.|\[[ xX]\])\s+/.test(nextTrimmed) ||
        /^>\s+/.test(nextTrimmed) ||
        /^---+$/.test(nextTrimmed) ||
        /^\*\*\*+$/.test(nextTrimmed)
      ) {
        break;
      }
      paragraphLines.push(nextLine);
      index += 1;
    }

    blocks.push(
      <div key={`paragraph-${index}`} className="space-y-2">
        {paragraphLines.map((paragraphLine, lineIndex) => (
          <p key={`line-${index}-${lineIndex}`} className="text-sm leading-7 text-foreground/95">
            {renderInlineAssistantText(paragraphLine.trim())}
          </p>
        ))}
      </div>
    );
  }

  return blocks;
}

function getFriendlyAiError(error: string | null) {
  if (!error) {
    return null;
  }

  if (error === 'INVALID_AI_CHAT_MODEL') {
    return 'This model is not a chat model. Choose a chat or instruct model instead of an embedding model.';
  }

  if (error === 'AI_EMPTY_RESPONSE') {
    return 'The provider returned an empty reply. Try turning streaming off, switching API mode, or choosing a different model.';
  }

  if (error === 'AI_SETTINGS_REQUIRED') {
    return 'Add your AI provider settings and API key first, then try again.';
  }

  if (error === 'AI_SETTINGS_LOAD_FAILED') {
    return 'Studio AI settings could not be loaded right now. Please try again in a moment.';
  }

  if (error === 'AI_SETTINGS_SAVE_FAILED') {
    return 'Studio AI settings could not be saved right now. Please try again.';
  }

  if (error === 'AI_CHAT_FAILED') {
    return 'The assistant could not get a response right now. Please try again.';
  }

  return error.startsWith('INVALID_') ? 'Some AI settings are invalid. Please review the fields and try again.' : 'Something went wrong. Please try again.';
}

export function StudioAiAssistantTrigger({ className }: { className?: string }) {
  const isOpen = useStudioAiStore((state) => state.isOpen);
  const openChat = useStudioAiStore((state) => state.openChat);
  const setOpen = useStudioAiStore((state) => state.setOpen);

  return (
    <Button
      variant="outline"
      className={cn(
        'rounded-full border-border/70 bg-background/80 px-4 text-sm font-medium text-foreground shadow-sm hover:bg-secondary/70',
        className
      )}
      onClick={() => {
        if (isOpen) {
          setOpen(false);
          return;
        }

        openChat();
      }}
      title={isOpen ? 'Close AI' : 'Talk with AI'}
      aria-pressed={isOpen}
    >
      <StudioAiIcon size={24} className="mr-2" />
      <span>{isOpen ? 'Close AI' : 'Talk with AI'}</span>
    </Button>
  );
}

export function StudioAiAssistantWindow() {
  const isMobile = useIsMobile();
  const {
    isOpen,
    activeTab,
    position,
    pendingPrompt,
    setOpen,
    setActiveTab,
    setPosition,
    clearPendingPrompt,
  } = useStudioAiStore();
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [settings, setSettings] = useState<StudioAiSettings | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [providerKind, setProviderKind] = useState<ProviderKind>('gemini');
  const [providerLabel, setProviderLabel] = useState('Gemini');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState(defaultGeminiModel);
  const [endpointMode, setEndpointMode] = useState<EndpointMode>('chat-completions');
  const [streamEnabled, setStreamEnabled] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Connect your AI provider once, then ask for title ideas, upload guidance, analytics explanations, and channel strategy from anywhere in Studio.',
    },
  ]);
  const [draft, setDraft] = useState('');
  const chatScrollAreaRef = useRef<HTMLDivElement | null>(null);
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const pendingTokensRef = useRef<string[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drainWaitersRef = useRef<Array<() => void>>([]);

  const settingsDescription = useMemo(() => {
    if (providerKind === 'gemini') {
      return 'Use a Google Gemini API key. You can enter any Gemini model id you want to use.';
    }

    return 'Use any OpenAI-compatible endpoint, including DeepSeek, OpenAI, Groq, OpenRouter, or a custom compatible gateway.';
  }, [providerKind]);

  const providerChanged = Boolean(settings && providerKind !== settings.providerKind);

  const trimmedProviderLabel = providerLabel.trim();
  const trimmedBaseUrl = baseUrl.trim();
  const trimmedModel = model.trim();
  const trimmedApiKey = apiKey.trim();

  const hasUnsavedChanges = useMemo(() => {
    if (!settings) {
      return Boolean(trimmedProviderLabel || trimmedModel || trimmedBaseUrl || trimmedApiKey);
    }

    return (
      providerKind !== settings.providerKind ||
      trimmedProviderLabel !== settings.providerLabel ||
      trimmedBaseUrl !== (settings.baseUrl || '') ||
      trimmedModel !== settings.model ||
      endpointMode !== settings.endpointMode ||
      streamEnabled !== settings.streamEnabled ||
      Boolean(trimmedApiKey)
    );
  }, [
    endpointMode,
    providerKind,
    settings,
    streamEnabled,
    trimmedApiKey,
    trimmedBaseUrl,
    trimmedModel,
    trimmedProviderLabel,
  ]);

  useEffect(() => {
    if (settingsLoaded) {
      return;
    }

    let active = true;
    setLoadingSettings(true);
    setError(null);

    Promise.race([
      apiGet<{ settings: StudioAiSettings | null }>('/api/studio/ai/settings', {
        progressMode: 'silent',
      }),
      new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error('AI_SETTINGS_LOAD_FAILED')), SETTINGS_LOAD_TIMEOUT_MS);
      }),
    ])
      .then((payload) => {
        if (!active) {
          return;
        }

        setSettings(payload.settings);
        if (payload.settings) {
          setProviderKind(payload.settings.providerKind);
          setProviderLabel(payload.settings.providerLabel);
          setBaseUrl(payload.settings.baseUrl || '');
          setModel(payload.settings.model);
          setEndpointMode(payload.settings.endpointMode);
          setStreamEnabled(payload.settings.streamEnabled);
        } else if (isOpen) {
          setActiveTab('settings');
        }
        setSettingsLoaded(true);
      })
      .catch((caught) => {
        if (!active) {
          return;
        }

        setError(caught instanceof Error ? caught.message : 'AI_SETTINGS_LOAD_FAILED');
        if (isOpen) {
          setActiveTab('settings');
        }
        setSettingsLoaded(true);
      })
      .finally(() => {
        if (active) {
          setLoadingSettings(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isOpen, setActiveTab, settingsLoaded]);

  useEffect(() => {
    if (activeTab !== 'chat') {
      return;
    }

    requestAnimationFrame(() => {
      const viewport = chatScrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement | null;
      if (!viewport) {
        scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        return;
      }

      viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
    });
  }, [messages]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'chat') {
      return;
    }

    requestAnimationFrame(() => {
      const viewport = chatScrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement | null;
      if (!viewport) {
        return;
      }

      viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'auto' });
      setShowScrollToBottom(false);
    });
  }, [activeTab, isOpen]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'chat') {
      setShowScrollToBottom(false);
      return;
    }

    const viewport = chatScrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement | null;
    if (!viewport) {
      return;
    }

    const updateScrollState = () => {
      const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      setShowScrollToBottom(distanceFromBottom > 56);
    };

    updateScrollState();
    viewport.addEventListener('scroll', updateScrollState, { passive: true });
    return () => viewport.removeEventListener('scroll', updateScrollState);
  }, [activeTab, isOpen, messages.length]);

  useEffect(() => {
    return () => {
      requestControllerRef.current?.abort();
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (providerKind === 'gemini') {
      setProviderLabel((current) =>
        current === 'OpenAI-compatible' || current === 'DeepSeek / OpenAI-compatible'
          ? 'Gemini'
          : current || 'Gemini'
      );
      setModel((current) => current || defaultGeminiModel);
      return;
    }

    setProviderLabel((current) =>
      current === 'Gemini' ? 'DeepSeek / OpenAI-compatible' : current || 'DeepSeek / OpenAI-compatible'
    );
      setBaseUrl((current) => current || defaultOpenAiBaseUrl);
      setModel((current) => current || defaultOpenAiModel);
  }, [providerKind]);

  useEffect(() => {
    if (!isOpen || isMobile) {
      return;
    }

    if (!position && typeof window !== 'undefined') {
      setPosition(
        clampPosition(window.innerWidth - DESKTOP_WIDTH - 24, window.innerHeight - DESKTOP_HEIGHT - 24)
      );
      return;
    }

    if (position) {
      const next = clampPosition(position.x, position.y);
      if (next.x !== position.x || next.y !== position.y) {
        setPosition(next);
      }
    }
  }, [isMobile, isOpen, position, setPosition]);

  const handleSaveSettings = async () => {
    if (settings && !hasUnsavedChanges) {
      setActiveTab('chat');
      return;
    }

    setSavingSettings(true);
    setError(null);
    setStatusMessage(null);

    try {
      const payloadBody: Record<string, string | boolean> = {
        providerKind,
        providerLabel: trimmedProviderLabel,
        baseUrl: trimmedBaseUrl,
        model: trimmedModel,
        endpointMode,
        streamEnabled,
      };

      if (trimmedApiKey) {
        payloadBody.apiKey = trimmedApiKey;
      }

      const payload = await apiSend<{ settings: StudioAiSettings }>('/api/studio/ai/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadBody),
      });

      const wasFirstConnect = !settings;
      setSettings(payload.settings);
      setProviderKind(payload.settings.providerKind);
      setProviderLabel(payload.settings.providerLabel);
      setBaseUrl(payload.settings.baseUrl || '');
      setModel(payload.settings.model);
      setEndpointMode(payload.settings.endpointMode);
      setStreamEnabled(payload.settings.streamEnabled);
      setApiKey('');
      setActiveTab('chat');
      setStatusMessage(wasFirstConnect ? 'AI provider connected.' : 'Settings updated.');
      if (wasFirstConnect) {
        setMessages((current) => [
          ...current,
          {
            role: 'assistant',
            content: `Connected ${payload.settings.providerLabel}. I’m ready to help with analytics, uploads, titles, descriptions, and growth ideas.`,
          },
        ]);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'AI_SETTINGS_SAVE_FAILED');
    } finally {
      setSavingSettings(false);
    }
  };

  const flushPendingStreamTokens = () => {
    if (flushTimerRef.current) {
      return;
    }

    const tick = () => {
      const nextToken = pendingTokensRef.current.shift();
      if (typeof nextToken === 'string') {
        setMessages((current) => {
          const copy = [...current];
          const last = copy[copy.length - 1];
          if (!last || last.role !== 'assistant') {
            copy.push({ role: 'assistant', content: nextToken });
            return copy;
          }

          copy[copy.length - 1] = {
            ...last,
            content: `${last.content}${nextToken}`,
          };
          return copy;
        });
      }

      if (pendingTokensRef.current.length > 0) {
        flushTimerRef.current = setTimeout(tick, STREAM_WORD_DELAY_MS);
        return;
      }

      flushTimerRef.current = null;
      if (drainWaitersRef.current.length > 0) {
        const waiters = [...drainWaitersRef.current];
        drainWaitersRef.current = [];
        waiters.forEach((resolve) => resolve());
      }
    };

    flushTimerRef.current = setTimeout(tick, STREAM_WORD_DELAY_MS);
  };

  const queueAssistantStreamChunk = (chunk: string) => {
    if (!chunk) {
      return;
    }

    pendingTokensRef.current.push(...tokenizeForTyping(chunk));
    flushPendingStreamTokens();
  };

  const waitForPendingStreamTokens = () =>
    new Promise<void>((resolve) => {
      if (!pendingTokensRef.current.length && !flushTimerRef.current) {
        resolve();
        return;
      }

      drainWaitersRef.current.push(resolve);
    });

  const stopSending = () => {
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;
  };

  const handleClearApiKey = async () => {
    if (!settings?.hasApiKey) {
      return;
    }

    setSavingSettings(true);
    setError(null);
    setStatusMessage(null);

    try {
      const payload = await apiSend<{ settings: StudioAiSettings }>('/api/studio/ai/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearApiKey: true }),
      });

      setSettings(payload.settings);
      setApiKey('');
      setStatusMessage('Saved API key removed.');
      setActiveTab('settings');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'AI_SETTINGS_SAVE_FAILED');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSend = async (messageOverride?: string) => {
    const message = (messageOverride ?? draft).trim();
    if (!message || sending) {
      return;
    }

    const nextMessages = [...messages, { role: 'user' as const, content: message }];
    setMessages(nextMessages);
    if (messageOverride === undefined) {
      setDraft('');
    }
    setSending(true);
    setError(null);
    setStatusMessage(null);
    pendingTokensRef.current = [];
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }

    try {
      const currentPagePath = typeof window === 'undefined' ? '/studio' : window.location.pathname;
      const currentPageOrigin =
        typeof window === 'undefined' ? 'http://localhost:9002' : window.location.origin;

      if (settings?.streamEnabled) {
        setMessages((current) => [...current, { role: 'assistant', content: '' }]);
        const controller = new AbortController();
        requestControllerRef.current = controller;

        const response = await fetch('/api/studio/ai/chat', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: nextMessages,
            stream: true,
            pagePath: currentPagePath,
            pageOrigin: currentPageOrigin,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || 'AI_CHAT_FAILED');
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('AI_EMPTY_RESPONSE');
        }

        const decoder = new TextDecoder();
        let reply = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          reply += chunk;
          queueAssistantStreamChunk(chunk);
        }

        const trailingChunk = decoder.decode();
        if (trailingChunk) {
          reply += trailingChunk;
          queueAssistantStreamChunk(trailingChunk);
        }

        await waitForPendingStreamTokens();

        if (!reply.trim()) {
          throw new Error('AI_EMPTY_RESPONSE');
        }
      } else {
        const controller = new AbortController();
        requestControllerRef.current = controller;
        const response = await fetch('/api/studio/ai/chat', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: nextMessages,
            pagePath: currentPagePath,
            pageOrigin: currentPageOrigin,
          }),
          signal: controller.signal,
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error || 'AI_CHAT_FAILED');
        }

        setMessages((current) => [...current, { role: 'assistant', content: payload.reply }]);
      }
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') {
        setMessages((current) => {
          const copy = [...current];
          const last = copy[copy.length - 1];
          if (last?.role === 'assistant' && !last.content.trim()) {
            copy.pop();
          }
          return copy;
        });
        setStatusMessage('Response canceled.');
        return;
      }

      const code = caught instanceof Error ? caught.message : 'AI_CHAT_FAILED';
      setMessages((current) => {
        const copy = [...current];
        const last = copy[copy.length - 1];
        if (last?.role === 'assistant' && !last.content.trim()) {
          copy.pop();
        }
        return copy;
      });
      setError(code);
      if (code === 'AI_SETTINGS_REQUIRED') {
        setActiveTab('settings');
      }
    } finally {
      requestControllerRef.current = null;
      setSending(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !pendingPrompt || !settingsLoaded || loadingSettings || savingSettings || sending) {
      return;
    }

    if (!settings?.hasApiKey) {
      setActiveTab('settings');
      setStatusMessage(`Connect your AI provider first, then I’ll send: "${pendingPrompt.text}"`);
      return;
    }

    setActiveTab('chat');
    clearPendingPrompt();
    void handleSend(pendingPrompt.text);
  }, [
    clearPendingPrompt,
    isOpen,
    loadingSettings,
    pendingPrompt,
    savingSettings,
    sending,
    setActiveTab,
    settings,
    settingsLoaded,
  ]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isMobile) {
      return;
    }

    const basePosition =
      position ??
      clampPosition(
        (typeof window !== 'undefined' ? window.innerWidth : DESKTOP_WIDTH) - DESKTOP_WIDTH - 24,
        (typeof window !== 'undefined' ? window.innerHeight : DESKTOP_HEIGHT) - DESKTOP_HEIGHT - 24
      );

    dragStateRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - basePosition.x,
      offsetY: event.clientY - basePosition.y,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isMobile || !dragStateRef.current || dragStateRef.current.pointerId !== event.pointerId) {
      return;
    }

    setPosition(
      clampPosition(
        event.clientX - dragStateRef.current.offsetX,
        event.clientY - dragStateRef.current.offsetY
      )
    );
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current || dragStateRef.current.pointerId !== event.pointerId) {
      return;
    }

    dragStateRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  if (!isOpen) {
    return null;
  }

  const windowStyle =
    isMobile || !position
      ? undefined
      : {
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${DESKTOP_WIDTH}px`,
          height: `${DESKTOP_HEIGHT}px`,
        };

  const showSettingsHint = !settings || !settings.hasApiKey || activeTab === 'settings';
  const friendlyError = getFriendlyAiError(error);

  const scrollChatToBottom = () => {
    const viewport = chatScrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement | null;
    if (!viewport) {
      scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      return;
    }

    viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-[80]">
      <div
        className={cn(
          'pointer-events-auto fixed flex min-h-0 flex-col overflow-hidden border border-border/70 bg-background/95 shadow-2xl backdrop-blur-xl',
          isMobile
            ? 'inset-0 h-[100dvh] w-full rounded-none'
            : 'h-[640px] w-[420px] rounded-[28px]',
          !isMobile && !position && 'bottom-6 right-6'
        )}
        style={windowStyle}
      >
        <div
          className={cn(
            'flex items-center justify-between border-b border-border/70 px-4 py-3'
          )}
        >
          <div
            className={cn('flex min-w-0 items-center gap-3', !isMobile && 'cursor-grab active:cursor-grabbing')}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <div className="flex h-10 w-10 items-center justify-center">
              <StudioAiIcon size={32} className="rounded-none" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">Studio AI</p>
              <p className="truncate text-xs text-muted-foreground">
                {settings?.providerLabel ? `${settings.providerLabel} · ${settings.model}` : 'Connect your AI provider'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'chat' | 'settings')}>
              <TabsList className="rounded-full bg-secondary/60 p-1">
                <TabsTrigger value="chat" className="rounded-full px-3 py-1.5 text-xs">
                  Chat
                </TabsTrigger>
                <TabsTrigger value="settings" className="rounded-full px-3 py-1.5 text-xs">
                  Settings
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => setOpen(false)}
              title="Close Studio AI"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {loadingSettings ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : activeTab === 'settings' ? (
          <ScrollArea className="flex-1">
            <div className="space-y-5 px-5 py-5">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Assistant settings</p>
                <p className="text-xs leading-5 text-muted-foreground">
                  Save your AI provider once, then keep chatting anywhere in Studio without re-entering it.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ai-provider-kind">Provider</Label>
                <Select value={providerKind} onValueChange={(value) => setProviderKind(value as ProviderKind)}>
                  <SelectTrigger id="ai-provider-kind" className="rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={8} className="z-[1000] rounded-2xl">
                    <SelectItem value="gemini">Gemini</SelectItem>
                    <SelectItem value="openai-compatible">OpenAI-compatible</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{settingsDescription}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ai-provider-label">Provider label</Label>
                <Input
                  id="ai-provider-label"
                  value={providerLabel}
                  onChange={(event) => setProviderLabel(event.target.value)}
                  className="rounded-2xl"
                  placeholder={providerKind === 'gemini' ? 'Gemini' : 'DeepSeek / OpenAI-compatible'}
                />
              </div>

              {providerKind === 'openai-compatible' ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="ai-base-url">Base URL</Label>
                    <Input
                      id="ai-base-url"
                      value={baseUrl}
                      onChange={(event) => setBaseUrl(event.target.value)}
                      className="rounded-2xl"
                      placeholder="https://api.deepseek.com/v1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ai-endpoint-mode">API mode</Label>
                    <Select value={endpointMode} onValueChange={(value) => setEndpointMode(value as EndpointMode)}>
                      <SelectTrigger id="ai-endpoint-mode" className="rounded-2xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={8} className="z-[1000] rounded-2xl">
                        <SelectItem value="chat-completions">Chat completions</SelectItem>
                        <SelectItem value="responses">Responses API</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Use <span className="font-medium">Responses API</span> for providers or models that answer there instead of the classic chat endpoint.
                    </p>
                  </div>
                </>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="ai-model">Model</Label>
                <Input
                  id="ai-model"
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  className="rounded-2xl"
                  placeholder={providerKind === 'gemini' ? defaultGeminiModel : defaultOpenAiModel}
                />
              </div>

              <div className="flex items-start justify-between gap-4 rounded-2xl border border-border/70 bg-secondary/20 px-4 py-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Stream replies</p>
                  <p className="text-xs leading-5 text-muted-foreground">
                    Show the assistant response live while it is being generated.
                  </p>
                </div>
                <Switch checked={streamEnabled} onCheckedChange={setStreamEnabled} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ai-key">API key</Label>
                <Input
                  id="ai-key"
                  type="password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  className="rounded-2xl"
                  placeholder={settings?.hasApiKey ? 'Paste a new key only if you want to replace the current one' : 'Paste your provider key'}
                />
                <p className="text-xs text-muted-foreground">
                  {settings?.hasApiKey
                    ? providerChanged
                      ? 'Switching provider requires a new API key.'
                      : 'Leave this blank to keep the current saved key.'
                    : 'Your key is stored encrypted in your Waslmedia database and applied automatically next time.'}
                </p>
              </div>

              {settings?.hasApiKey ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-secondary/20 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <KeyRound className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">Current saved key</p>
                      <p className="truncate text-xs text-muted-foreground">{settings.maskedApiKey}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="rounded-full px-4"
                    onClick={handleClearApiKey}
                    disabled={savingSettings}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete key
                  </Button>
                </div>
              ) : null}

              {friendlyError ? (
                <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{friendlyError}</p>
              ) : null}
              {statusMessage ? (
                <p className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
                  {statusMessage}
                </p>
              ) : null}

              <div className="flex items-center justify-end gap-3 pt-2">
                {settings ? (
                  <Button variant="ghost" className="rounded-full px-5" onClick={() => setActiveTab('chat')}>
                    Back to chat
                  </Button>
                ) : null}
                <Button
                  className="rounded-full px-5"
                  onClick={handleSaveSettings}
                  disabled={savingSettings || (!hasUnsavedChanges && Boolean(settings))}
                >
                  {savingSettings ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {settings ? 'Save changes' : 'Save settings'}
                </Button>
              </div>
            </div>
          </ScrollArea>
        ) : (
          <>
            <div className="relative flex-1 min-h-0">
            <ScrollArea ref={chatScrollAreaRef} className="flex-1 px-4 py-4 h-full">
              {showSettingsHint ? (
                <EmptyAssistantState
                  title="Set up your assistant"
                  description="Choose an AI provider in Settings, save your key, then come back here to ask about channel performance, content ideas, and upload strategy."
                />
              ) : (
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={cn(
                        'max-w-[86%] rounded-[24px] px-4 py-3 text-sm leading-6',
                        message.role === 'user'
                          ? 'ml-auto bg-primary/10 text-foreground'
                          : 'bg-secondary/65 text-foreground'
                      )}
                    >
                      {message.content ? (
                        <>
                          {message.role === 'assistant' ? (
                            <div className="space-y-2">{renderAssistantMessage(message.content)}</div>
                          ) : (
                            <span>{message.content}</span>
                          )}
                          {sending && index === messages.length - 1 && message.role === 'assistant' ? (
                            <span className="ml-1 inline-block h-4 w-[2px] animate-pulse rounded-full bg-current align-middle opacity-70" />
                          ) : null}
                        </>
                      ) : sending && index === messages.length - 1 && message.role === 'assistant' ? (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <span className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-current" />
                        </span>
                      ) : null}
                    </div>
                  ))}
                  <div ref={scrollAnchorRef} />
                </div>
              )}
            </ScrollArea>
            {showScrollToBottom ? (
              <Button
                type="button"
                size="icon"
                className="absolute bottom-4 right-4 z-10 h-10 w-10 rounded-full border border-border/70 bg-background/95 shadow-lg"
                variant="secondary"
                onClick={scrollChatToBottom}
                title="Scroll to latest message"
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            ) : null}
            </div>

            <div className="border-t border-border/70 px-4 py-4">
              {friendlyError && activeTab === 'chat' ? (
                <p className="mb-3 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {friendlyError}
                </p>
              ) : null}
              {statusMessage && activeTab === 'chat' ? (
                <p className="mb-3 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
                  {statusMessage}
                </p>
              ) : null}
              <div
                className={cn(
                  'overflow-hidden rounded-[28px] border bg-background/95 shadow-[0_12px_32px_rgba(0,0,0,0.08)] transition-all duration-200',
                  isComposerFocused
                    ? 'border-sky-400/80 shadow-[0_18px_44px_rgba(56,189,248,0.22)]'
                    : 'border-border/70'
                )}
              >
                <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onFocus={() => setIsComposerFocused(true)}
                  onBlur={() => setIsComposerFocused(false)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void handleSend();
                    }
                  }}
                  placeholder="Ask about analytics, titles, Shorts strategy, thumbnails, or channel growth. Chat stays only on this device."
                  className="min-h-[88px] resize-none border-0 bg-transparent px-5 pt-4 pb-3 text-sm shadow-none outline-none placeholder:text-muted-foreground/70 focus-visible:!outline-none focus-visible:!ring-0 focus-visible:!ring-offset-0"
                />
                <div className="flex items-center justify-between gap-3 border-t border-border/70 px-4 py-3">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <button type="button" className="rounded-full p-2 transition-colors hover:bg-secondary/70" title="Photos coming soon">
                      <ImagePlus className="h-4 w-4" />
                    </button>
                    <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
                      Coming soon
                    </span>
                  </div>
                  <Button
                    className={cn(
                      'h-11 rounded-full px-5 text-slate-950 transition-all',
                      sending ? 'bg-rose-400 hover:bg-rose-300' : 'bg-sky-400 hover:bg-sky-300'
                    )}
                    onClick={() => {
                      if (sending) {
                        stopSending();
                        return;
                      }

                      void handleSend();
                    }}
                    disabled={!sending && (!draft.trim() || !settings?.hasApiKey)}
                  >
                    {sending ? (
                      <StopCircle className="mr-2 h-4 w-4" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    {sending ? 'Cancel' : 'Send'}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
