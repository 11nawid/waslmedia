import { publicSiteConfig } from '@/config/public-site';

export interface PublicStat {
  label: string;
  value: string;
}

export interface PublicFeature {
  title: string;
  description: string;
  bullets?: string[];
}

export interface PublicHubCard {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
}

export interface PublicArticleSection {
  id: string;
  title: string;
  kicker?: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface PublicArticle {
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  updatedAt: string;
  lead: string;
  sections: PublicArticleSection[];
}

const merchantBusinessName = publicSiteConfig.businessName;
const merchantSupportEmail = publicSiteConfig.supportEmail;
const merchantResponseTime = publicSiteConfig.supportResponseTime;

export const publicNavigation = [
  { href: '/help-center/company', label: 'Company' },
  { href: '/help-center/docs', label: 'Docs' },
  { href: '/help-center/legal', label: 'Legal' },
  { href: '/help-center/contact', label: 'Contact' },
] as const;

export const publicFooterGroups = [
  {
    title: 'Company',
    links: [
      { href: '/help-center/company', label: 'Overview' },
      { href: '/help-center/company/about', label: 'About Waslmedia' },
      { href: '/help-center/company/contact', label: 'Contact' },
    ],
  },
  {
    title: 'Documentation',
    links: [
      { href: '/help-center/docs', label: 'Docs hub' },
      { href: '/help-center/docs/advertise', label: 'Advertise' },
      { href: '/help-center/docs/creators', label: 'Creators' },
      { href: '/help-center/docs/advertising', label: 'Advertising' },
      { href: '/help-center/docs/ai', label: 'AI at Waslmedia' },
      { href: '/help-center/docs/data-controls', label: 'Data controls' },
      { href: '/help-center/docs/safety', label: 'Safety' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/help-center/legal/terms', label: 'Terms' },
      { href: '/help-center/legal/privacy', label: 'Privacy' },
      { href: '/help-center/legal/refunds', label: 'Refunds' },
      { href: '/help-center/legal/service-fulfilment', label: 'Fulfilment' },
      { href: '/help-center/legal/cookies', label: 'Cookies' },
      { href: '/help-center/legal/data-policy', label: 'Data policy' },
      { href: '/help-center/legal/ads-policy', label: 'Ads policy' },
      { href: '/help-center/legal/ai-policy', label: 'AI policy' },
      { href: '/help-center/legal/community-guidelines', label: 'Community guidelines' },
    ],
  },
] as const;

export const companyLandingStats: PublicStat[] = [
  { label: 'Primary commercial offer', value: 'sponsored ad placements on Waslmedia' },
  { label: 'Fulfilment model', value: 'reviewed digital campaign delivery on-platform' },
  { label: 'Product direction', value: 'trustworthy advertising, clear policies, and useful media discovery' },
];

export const companyLandingFeatures: PublicFeature[] = [
  {
    title: 'For advertisers',
    description:
      'Waslmedia gives advertisers a clearer way to buy sponsored placements on Waslmedia itself, with managed review, visible policy standards, and operational billing guidance.',
    bullets: [
      'Advertise page, pricing guidance, and supported placement context',
      'Review workflows, campaign expectations, and policy-linked approval standards',
      'Refund, fulfilment, and contact pages designed for merchant review clarity',
    ],
  },
  {
    title: 'For creators',
    description:
      'Waslmedia still supports creators with uploads, channel management, playlists, Shorts-style content, and studio operations, but those product workflows are kept separate from the public merchant story.',
    bullets: [
      'Channel identity, uploads, playlists, and publishing defaults',
      'Watch history, engagement tools, and creator-facing analytics surfaces',
      'Studio workflows for metadata, moderation, and growth operations',
    ],
  },
  {
    title: 'For viewers',
    description:
      'Viewers use Waslmedia for discovery and playback, while public trust pages explain how advertising, privacy, and safety expectations are handled around that experience.',
    bullets: [
      'Streaming, watch later, liked videos, subscriptions, and playlists',
      'Location-aware and preference-aware discovery surfaces',
      'Data, privacy, and safety documentation that stays readable before sign-in',
    ],
  },
];

export const companyLandingNarrative: PublicArticleSection[] = [
  {
    id: 'positioning',
    title: 'A digital advertising merchant with a credible public face',
    kicker: 'Positioning',
    paragraphs: [
      'Waslmedia is designed to explain its public commercial offer clearly: advertisers purchase sponsored placements that run on Waslmedia itself, subject to review, policy alignment, and delivery standards.',
      'That matters because merchants, payment reviewers, advertisers, and users should be able to understand what is being sold before anyone pays or launches a campaign.',
    ],
  },
  {
    id: 'trust',
    title: 'Trust, safety, and accountability are part of the product story',
    kicker: 'Trust',
    paragraphs: [
      'Waslmedia is not presented as a black box. Public documentation explains what advertisers are buying, how campaign review works, how refunds and fulfilment are handled, and where support or policy questions should go.',
      'The goal is to make the business legible. People should understand what standards apply and what operational promises are being made before they buy ad inventory.',
    ],
  },
  {
    id: 'direction',
    title: 'Built for scale without feeling generic',
    kicker: 'Direction',
    paragraphs: [
      'The public experience is intentionally premium. It should feel editorial, cinematic, and current in dark mode, restrained and polished in light mode, and consistent with the app without copying the app shell.',
      'That gives Waslmedia room to grow into a fuller company website, documentation center, and legal surface over time without redesigning from scratch.',
    ],
  },
];

export const companyHubCards: PublicHubCard[] = [
  {
    href: '/help-center/company/about',
    eyebrow: 'Company',
    title: 'About Waslmedia',
    description: 'Read how Waslmedia positions its advertising service, public trust model, and merchant-facing product story.',
  },
  {
    href: '/help-center/company/contact',
    eyebrow: 'Company',
    title: 'Contact and support',
    description: 'Find the merchant contact route for advertising, billing, support, privacy, and policy follow-up.',
  },
  {
    href: '/help-center/docs/advertise',
    eyebrow: 'Documentation',
    title: 'Advertise on Waslmedia',
    description: 'See what advertisers buy, where sponsored placements appear, and how review and delivery work.',
  },
];

export const docsHubCards: PublicHubCard[] = [
  {
    href: '/help-center/docs/advertise',
    eyebrow: 'Docs',
    title: 'Advertise on Waslmedia',
    description: 'Understand the ad service, supported placements, review flow, billing basics, and delivery expectations.',
  },
  {
    href: '/help-center/docs/creators',
    eyebrow: 'Docs',
    title: 'Creators',
    description: 'How channels, uploads, publishing flows, audience controls, and creator operations fit together on Waslmedia.',
  },
  {
    href: '/help-center/docs/advertising',
    eyebrow: 'Docs',
    title: 'Advertising',
    description: 'Understand packages, review standards, campaign operations, billing expectations, and advertiser responsibilities.',
  },
  {
    href: '/help-center/docs/ai',
    eyebrow: 'Docs',
    title: 'AI at Waslmedia',
    description: 'See where AI is used, what it helps with, what it does not decide alone, and how users should interpret AI-generated assistance.',
  },
  {
    href: '/help-center/docs/data-controls',
    eyebrow: 'Docs',
    title: 'Data controls',
    description: 'Learn how history, personalization, privacy controls, and account-level data choices are surfaced to users.',
  },
  {
    href: '/help-center/docs/safety',
    eyebrow: 'Docs',
    title: 'Safety and trust',
    description: 'Review moderation expectations, reports, enforcement pathways, ad safety, and operational trust guidance.',
  },
];

export const legalHubCards: PublicHubCard[] = [
  {
    href: '/help-center/legal/terms',
    eyebrow: 'Legal',
    title: 'Terms of service',
    description: 'The formal rules for using Waslmedia and purchasing sponsored advertising services on the platform.',
  },
  {
    href: '/help-center/legal/privacy',
    eyebrow: 'Legal',
    title: 'Privacy policy',
    description: 'How Waslmedia collects, uses, stores, and shares personal data across its product and public services.',
  },
  {
    href: '/help-center/legal/refunds',
    eyebrow: 'Legal',
    title: 'Cancellation and refunds',
    description: 'How final ad payments, wallet-credit outcomes, and campaign cancellation requests are handled on Waslmedia.',
  },
  {
    href: '/help-center/legal/service-fulfilment',
    eyebrow: 'Legal',
    title: 'Service fulfilment',
    description: 'How Waslmedia fulfils digital advertising services and why no physical shipping applies.',
  },
  {
    href: '/help-center/legal/cookies',
    eyebrow: 'Legal',
    title: 'Cookies',
    description: 'A practical explanation of cookies, local storage, session technology, and measurement tooling used by the platform.',
  },
  {
    href: '/help-center/legal/data-policy',
    eyebrow: 'Legal',
    title: 'Data policy',
    description: 'A deeper operational view of retention, access controls, request handling, and platform data stewardship.',
  },
  {
    href: '/help-center/legal/ads-policy',
    eyebrow: 'Legal',
    title: 'Ads policy',
    description: 'The standards that govern advertiser onboarding, approval, prohibited content, and delivery expectations.',
  },
  {
    href: '/help-center/legal/community-guidelines',
    eyebrow: 'Legal',
    title: 'Community guidelines',
    description: 'The conduct and content rules that protect viewers, creators, and advertisers across the Waslmedia network.',
  },
  {
    href: '/help-center/legal/ai-policy',
    eyebrow: 'Legal',
    title: 'AI policy',
    description: 'The formal public policy that explains where AI is used, how it is governed, and where human judgment remains required.',
  },
];

export const companyPages: Record<string, PublicArticle> = {
  about: {
    slug: 'about',
    eyebrow: 'Company',
    title: 'About Waslmedia',
    description: 'How Waslmedia presents its advertising service, merchant trust model, and public approach to product and data responsibility.',
    updatedAt: 'April 2, 2026',
    lead:
      `${merchantBusinessName} is an independently operated digital media service whose primary public commercial offer is sponsored advertising placements on the Waslmedia platform. The surrounding company and policy pages are designed to explain what advertisers are buying, how review and delivery work, and how privacy and trust are handled around that service.`,
    sections: [
      {
        id: 'mission',
        title: 'Mission and product focus',
        kicker: 'Mission',
        paragraphs: [
          'Waslmedia focuses on making sponsored advertising placements feel easier to understand before payment happens. Advertisers should be able to see what inventory they are buying, what review standards apply, and how fulfilment happens on-platform.',
          'The wider product still supports media publishing and discovery, but the public merchant-facing surface is intentionally clearer and narrower: explain the advertising offer, the policy standards, and the operational rules without forcing reviewers or buyers to infer them.',
        ],
      },
      {
        id: 'independence',
        title: 'Private and independently run',
        kicker: 'Ownership and direction',
        paragraphs: [
          'Waslmedia is not presented as a marketplace of third-party payment flows or a general-purpose software platform for outside merchants. The commercial relationship is simpler: advertisers buy placements that run on Waslmedia itself.',
          'That narrower framing matters because it keeps the business easier to understand. Payment providers, advertisers, and users should be able to tell what Waslmedia does commercially without reading the product as infrastructure or platform software.',
        ],
      },
      {
        id: 'audiences',
        title: 'Who Waslmedia serves',
        kicker: 'Audiences',
        paragraphs: [
          'Advertisers use Waslmedia to purchase managed sponsored placements through a structured campaign flow with pricing, review, billing, and delivery guidance. That is the primary merchant offer the public business pages are built to explain.',
          'Creators and viewers still use Waslmedia as a media product, but those product roles are no longer allowed to obscure the merchant story shown to payment reviewers and prospective advertisers.',
        ],
        bullets: [
          'Advertisers need clarity around review, placement, billing, prohibited categories, and reputational safety.',
          'Creators need clarity around content, rights, moderation, and channel operations.',
          'Viewers need clarity around recommendations, privacy, history, safety, and reporting.',
        ],
      },
      {
        id: 'trust-model',
        title: 'Trust, enforcement, and platform accountability',
        kicker: 'Trust model',
        paragraphs: [
          'Waslmedia treats policies and trust documentation as part of the user experience. Community rules, ad rules, AI disclosures, and privacy disclosures are all organized so that a user can find the right answer without digging through a single overloaded page.',
          'The platform approach is simple: public promises should match actual behavior. If Waslmedia uses AI in a workflow, there should be a public explanation. If it collects data, there should be a clear reason. If it supports advertising, there should be visible standards. If it says it does not sell user data, that should remain true in practice.',
        ],
      },
      {
        id: 'data-position',
        title: 'A simple position on user data',
        kicker: 'Privacy position',
        paragraphs: [
          'Waslmedia does not sell personal data. It also does not share user data with outside companies for their own marketing, profiling, or resale. The platform uses data to run Waslmedia itself, not to turn user information into a separate business.',
          'When outside services are needed to operate the platform, such as hosting, security, payments, or infrastructure support, those services are used as operational providers. They are not treated as partners who get user data for their own advertising business.',
        ],
      },
      {
        id: 'design-principles',
        title: 'Design principles behind the public surface',
        kicker: 'Design',
        paragraphs: [
          'The public experience is intended to feel premium and controlled. In dark mode it should feel cinematic and confident; in light mode it should feel editorial and high-trust. On mobile it should feel fluid and calm rather than compressed into repetitive cards.',
          'This is not just visual polish. Strong design in company and legal surfaces signals product maturity, operational seriousness, and respect for the people who are being asked to trust the platform.',
        ],
      },
    ],
  },
  contact: {
    slug: 'contact',
    eyebrow: 'Company',
    title: 'Contact Waslmedia',
    description: 'How to reach Waslmedia for advertiser inquiries, billing questions, support, privacy, and policy follow-up.',
    updatedAt: 'April 2, 2026',
    lead:
      `${merchantBusinessName} uses a single public support route for merchant and policy follow-up. The primary contact email is ${merchantSupportEmail}, and Waslmedia generally aims to respond within ${merchantResponseTime}.`,
    sections: [
      {
        id: 'support',
        title: 'Product support and account help',
        kicker: 'Support',
        paragraphs: [
          `General support, advertiser follow-up, and account questions should be sent to ${merchantSupportEmail}. Requests are easier to resolve when they include the relevant account, campaign, or page context from the start.`,
          `Waslmedia generally aims to respond within ${merchantResponseTime}, although policy-sensitive, billing-sensitive, or review-sensitive matters may take longer when additional verification is needed.`,
        ],
        bullets: [
          `Primary public support email: ${merchantSupportEmail}`,
          `Standard response window: ${merchantResponseTime}`,
          'Include account, campaign, or billing context to reduce back-and-forth.',
        ],
      },
      {
        id: 'advertising',
        title: 'Advertiser and campaign inquiries',
        kicker: 'Advertising',
        paragraphs: [
          'Advertisers should start with the public advertising, refund, fulfilment, and ads policy pages before requesting follow-up. Those pages explain what is being purchased, how campaign review works, and when delivery or refund expectations change.',
          'Campaign-specific questions should be framed with the campaign stage, objective, placement, and payment context so Waslmedia can triage the request correctly.',
        ],
        bullets: [
          'Start with `/help-center/docs/advertise` for the merchant-facing ad offer.',
          'Use `/help-center/docs/advertising` for operational campaign guidance.',
          'Use `/help-center/legal/refunds` and `/help-center/legal/service-fulfilment` for payment and delivery expectations.',
          'Use `/help-center/legal/ads-policy` for review standards and restricted categories.',
          'Provide campaign context clearly when requesting follow-up on approval or delivery.',
        ],
      },
      {
        id: 'safety',
        title: 'Trust, safety, and enforcement concerns',
        kicker: 'Trust and safety',
        paragraphs: [
          'If a request relates to harmful content, abusive behavior, policy violations, ad integrity, impersonation, or similar trust issues, Waslmedia expects the issue to be reviewed against the relevant public rules. That is why the legal and documentation pages are designed to be explicit rather than vague.',
          'Users should reference the applicable guideline or policy category where possible. That improves review quality and reduces ambiguity during triage.',
        ],
        bullets: [
          'See `/help-center/legal/community-guidelines` for content and conduct expectations.',
          'See `/help-center/docs/safety` for operational safety guidance and reporting context.',
          'See `/help-center/legal/ads-policy` if the issue involves sponsored or advertiser content.',
        ],
      },
      {
        id: 'governance',
        title: 'Privacy, data, and governance questions',
        kicker: 'Governance',
        paragraphs: [
          'Questions about data collection, account-level data choices, AI disclosures, and platform governance should start with the relevant public policies. Waslmedia’s public surface is designed so users can understand these topics before they need escalation.',
          `If a matter cannot be resolved through the policy and product routes alone, the formal request should be documented and sent to ${merchantSupportEmail} with the account context, relevant feature, and the exact issue or request being made.`,
        ],
        bullets: [
          'Review `/help-center/legal/privacy` and `/help-center/legal/data-policy` for privacy and handling expectations.',
          'Review `/help-center/legal/ai-policy` and `/help-center/docs/ai` for AI-related questions.',
          'Use `/help-center/docs/data-controls` for product-facing privacy and history controls.',
        ],
      },
    ],
  },
};

export const docsPages: Record<string, PublicArticle> = {
  advertise: {
    slug: 'advertise',
    eyebrow: 'Documentation',
    title: 'Advertise on Waslmedia',
    description: 'What advertisers buy on Waslmedia, which placements are supported, how review works, and what happens after payment.',
    updatedAt: 'April 3, 2026',
    lead:
      'Waslmedia sells sponsored advertising placements that run on Waslmedia itself. This page explains the merchant-facing offer: what inventory advertisers are buying, how approval works, how campaigns are fulfilled, and where billing or policy questions should go.',
    sections: [
      {
        id: 'offer',
        title: 'What advertisers are buying',
        kicker: 'Commercial offer',
        paragraphs: [
          'Advertisers are purchasing managed sponsored placements on Waslmedia-owned surfaces, not software licenses, creator payouts, or third-party marketplace services.',
          'The advertising purchase is tied to campaign setup, creative review, policy fit, and delivery on Waslmedia where the selected placements are currently offered.',
          'Where video is uploaded as part of an ad campaign, that video is treated as creative used to deliver sponsored placements. The advertiser is not buying a standalone video-hosting product through this payment flow.',
        ],
        bullets: [
          'Sponsored placements run on Waslmedia itself.',
          'Supported surfaces may include Home feed and Search placements where available.',
          'Campaign launch remains subject to review and operational readiness.',
        ],
      },
      {
        id: 'review',
        title: 'Review and approval before launch',
        kicker: 'Review',
        paragraphs: [
          'Campaigns are not treated as live simply because payment or submission happened. Waslmedia reviews creative assets, claims, targeting context, and policy fit before delivery begins.',
          'That review process exists to protect viewers, advertisers, and the platform from misleading, unsafe, or unsuitable promotional content. Waslmedia generally aims to complete ad review within 2-3 days, although complex or policy-sensitive campaigns can take longer.',
        ],
      },
      {
        id: 'billing',
        title: 'Billing and payment expectations',
        kicker: 'Billing',
        paragraphs: [
          'Advertisers should treat payment as part of a managed campaign workflow rather than as an instant self-serve entitlement. Waslmedia uses payment for sponsored ad purchases on Waslmedia itself, not for creator payouts, subscriptions, or marketplace settlements.',
          'Ad payments are generally final once captured. If Waslmedia rejects a campaign before delivery or cannot proceed for a platform-side reason, the default outcome is Waslmedia Wallet credit for a future eligible purchase rather than an automatic cash refund to the original payment method.',
          `For billing or campaign follow-up, contact ${merchantSupportEmail}. ${merchantBusinessName} generally aims to respond within ${merchantResponseTime}.`,
        ],
      },
      {
        id: 'delivery',
        title: 'Fulfilment and delivery',
        kicker: 'Fulfilment',
        paragraphs: [
          'Fulfilment happens through campaign setup, review, approval, and on-platform delivery. Timing can vary depending on campaign readiness, review outcome, and available inventory for the chosen placement.',
          'If Waslmedia determines before launch that a campaign cannot proceed, Waslmedia generally applies the amount as Waslmedia Wallet credit under the refunds policy.',
          'Advertisers should also review the cancellation, refund, fulfilment, and ads policy pages so payment and delivery expectations stay aligned.',
        ],
      },
    ],
  },
  creators: {
    slug: 'creators',
    eyebrow: 'Documentation',
    title: 'Creator documentation',
    description: 'A working guide to channel setup, publishing, audience controls, and creator-facing operations on Waslmedia.',
    updatedAt: 'April 2, 2026',
    lead:
      'Waslmedia is designed to support creators from first upload through channel management and growth operations. The creator documentation explains how those pieces fit together so channels can be run with fewer surprises and clearer expectations.',
    sections: [
      {
        id: 'channel-foundation',
        title: 'Channel identity and setup',
        kicker: 'Foundations',
        paragraphs: [
          'A creator presence on Waslmedia starts with channel identity: display name, handle, profile imagery, banner imagery, publishing defaults, and contact details where surfaced. These choices affect trust, discoverability, and consistency across channel surfaces.',
          'The platform is designed so core channel settings can be adjusted without rebuilding the whole channel identity every time a creator updates branding or publishing preferences.',
        ],
      },
      {
        id: 'publishing',
        title: 'Uploads, publishing, and metadata',
        kicker: 'Publishing',
        paragraphs: [
          'Publishing on Waslmedia is more than file transfer. Creators are expected to provide titles, descriptions, categories, tags, visibility choices, and other metadata that help the platform route content responsibly.',
          'Upload flows should be understood as operational entry points into the broader content system. Metadata quality affects search, audience fit, moderation clarity, and how a video is represented across the platform.',
        ],
        bullets: [
          'Provide accurate descriptions and classification details.',
          'Use stable default settings for repeated upload workflows.',
          'Review visibility and audience assumptions before publication.',
        ],
      },
      {
        id: 'community',
        title: 'Audience and community controls',
        kicker: 'Community',
        paragraphs: [
          'Creators interact with more than view counts. They manage comments, playlists, watch behavior, community surfaces, and the trust implications of how a channel shows up publicly. Clear defaults matter because small configuration decisions compound over time.',
          'Waslmedia treats creator controls as part of platform governance. Community tools are not just growth tools; they are also operational tools for safety, moderation, and long-term channel quality.',
        ],
      },
      {
        id: 'analytics',
        title: 'Studio and performance workflows',
        kicker: 'Operations',
        paragraphs: [
          'Studio surfaces are built to help creators understand channel activity, content performance, and publishing operations without leaving the product. The public documentation should make the role of these tools clear before a creator reaches for them in production.',
          'Analytics should be interpreted as directional operational data, not as a guarantee of future reach. Creators should use trends, audience patterns, and content quality indicators together rather than overreacting to a single metric.',
        ],
      },
    ],
  },
  advertising: {
    slug: 'advertising',
    eyebrow: 'Documentation',
    title: 'Advertising documentation',
    description: 'How Waslmedia advertising works, from packages and review to launch readiness, billing expectations, and policy fit.',
    updatedAt: 'April 2, 2026',
    lead:
      'Waslmedia’s advertising model is designed to be structured rather than opaque. Advertisers should understand that they are buying placements on Waslmedia itself, how review works, what content is prohibited, and what information is needed to launch responsibly.',
    sections: [
      {
        id: 'packages',
        title: 'Ad packages and campaign framing',
        kicker: 'Campaign setup',
        paragraphs: [
          'Advertisers should start by selecting the package or campaign shape that best matches their objective, timing, geography, and spend tolerance. Waslmedia’s ad tools are designed to keep package choice and creative review closely connected so expectations stay aligned.',
          'Campaign framing should be honest and specific. Ambiguous or inflated claims create friction during review and can delay launch or increase the likelihood of rejection.',
        ],
      },
      {
        id: 'review',
        title: 'Creative review and policy alignment',
        kicker: 'Review',
        paragraphs: [
          'All campaigns should be understood as reviewable. Approval is not automatic simply because creative assets were submitted successfully. Review exists to protect viewers, creators, and the platform from misleading or unsafe advertiser behavior.',
          'Advertisers should read the public ads policy before launch. Documentation tells them how to prepare; policy tells them what standards they must satisfy. Waslmedia generally aims to complete review within 2-3 days when creative and campaign details are ready.',
        ],
        bullets: [
          'Use accurate claims and supportable messaging.',
          'Avoid restricted or prohibited categories unless explicitly allowed.',
          'Prepare clean creative assets and landing experiences before submission.',
        ],
      },
      {
        id: 'delivery',
        title: 'Delivery, pacing, and campaign stewardship',
        kicker: 'Operations',
        paragraphs: [
          'Delivery should be interpreted operationally, not emotionally. Campaigns may pace differently based on review status, eligibility, placement fit, audience availability, and product-level safeguards.',
          'Waslmedia aims to expose enough campaign context that advertisers can understand what stage a campaign is in and what should happen next without guessing.',
        ],
      },
      {
        id: 'billing',
        title: 'Billing, expectations, and escalation',
        kicker: 'Commercial expectations',
        paragraphs: [
          'Advertisers should maintain complete billing and campaign context for every launch. A support or operational escalation is much easier to resolve when package choice, budget, timeframe, creative version, and payment state are clearly identified.',
          'Ad payments are generally treated as final. Where Waslmedia rejects a campaign before delivery or cannot proceed for a platform-side reason, the default commercial remedy is Waslmedia Wallet credit for future eligible platform purchases rather than an automatic return to the original payment method.',
          'Documentation is intended to reduce confusion before an escalation is needed. If a question remains after reviewing package and policy guidance, the escalation should reference the relevant campaign state and review context directly.',
        ],
      },
    ],
  },
  ai: {
    slug: 'ai',
    eyebrow: 'Documentation',
    title: 'AI at Waslmedia',
    description: 'Where AI appears in the platform, how to interpret its assistance, and where human review remains essential.',
    updatedAt: 'April 2, 2026',
    lead:
      'Waslmedia uses AI as an assistive capability rather than as a blanket replacement for judgment. AI can help with support, workflow acceleration, and operational interpretation, but users should understand both the value and the limits of those systems.',
    sections: [
      {
        id: 'where-ai-appears',
        title: 'Where AI may appear in the product',
        kicker: 'Product scope',
        paragraphs: [
          'AI may be used in creator-facing assistance, workflow recommendations, support surfaces, or internal operational tools. The exact product surface matters because AI should be understood in context rather than as a single monolithic feature.',
          'The public surface exists so users can understand that AI participation is selective, explicit, and tied to particular workflows, not an invisible decision-maker over every product action.',
        ],
      },
      {
        id: 'interpretation',
        title: 'How users should interpret AI output',
        kicker: 'User guidance',
        paragraphs: [
          'AI-generated suggestions, summaries, or assistant responses should be treated as guidance rather than guarantees. Users remain responsible for reviewing important outputs, especially when they affect public content, policy-sensitive actions, or commercial decisions.',
          'That is especially important in creator, advertiser, and support workflows where subtle factual or policy mistakes can have material consequences.',
        ],
      },
      {
        id: 'governance',
        title: 'Human judgment, escalation, and governance',
        kicker: 'Governance',
        paragraphs: [
          'Waslmedia does not present AI as an excuse to remove human oversight from important workflows. Human review remains necessary in policy interpretation, sensitive support matters, moderation escalation, and other high-impact contexts.',
          'The public documentation works alongside the AI policy so users can distinguish between product assistance and platform governance.',
        ],
      },
      {
        id: 'data',
        title: 'Data sensitivity and responsible usage',
        kicker: 'Data expectations',
        paragraphs: [
          'AI features should be evaluated against privacy, retention, and access expectations. Public documentation should help users understand the relationship between AI assistance and platform data handling rather than forcing them to infer it.',
          'For platform-level privacy expectations, users should also review the privacy, data, and AI policy documents in the legal section.',
        ],
      },
    ],
  },
  'data-controls': {
    slug: 'data-controls',
    eyebrow: 'Documentation',
    title: 'Data controls and account choices',
    description: 'How Waslmedia exposes history, personalization, privacy, and account-level data choices inside the product.',
    updatedAt: 'April 2, 2026',
    lead:
      'People need more than a privacy policy. They need to know which choices exist in-product, what those choices affect, and how to act on them. Waslmedia’s data-controls documentation explains the product-facing side of privacy and preference management.',
    sections: [
      {
        id: 'history',
        title: 'History and personalization controls',
        kicker: 'Watch history',
        paragraphs: [
          'History controls influence more than a single page. They can affect recommendations, continuity, convenience, and how the platform reflects a user’s recent activity back to them.',
          'Waslmedia should present these controls as understandable product levers rather than hidden account settings. Public documentation helps users see the consequence of enabling, disabling, or clearing those records.',
        ],
      },
      {
        id: 'account',
        title: 'Account data and profile settings',
        kicker: 'Account management',
        paragraphs: [
          'Account-level settings cover profile details, preferences, security-adjacent choices, and communication-related context. Users should be able to distinguish between public-facing profile settings and private account controls.',
          'The public docs should make it clear when a change affects discoverability, identity, communications, or internal account state.',
        ],
      },
      {
        id: 'privacy',
        title: 'Privacy settings versus policy disclosures',
        kicker: 'Privacy in practice',
        paragraphs: [
          'Policies explain what the platform may do; controls explain what the user can do. Waslmedia’s public docs should bridge that gap so people do not have to read a legal document just to understand a product choice.',
          'This page should be read alongside the legal privacy and data pages, not instead of them.',
        ],
      },
      {
        id: 'requests',
        title: 'When to use controls and when to use formal requests',
        kicker: 'Operational clarity',
        paragraphs: [
          'Some issues can be solved directly through settings and user controls. Others require formal follow-up, documented privacy rights handling, or trust-related review. The public surface should clarify that difference clearly.',
          'If a user cannot achieve the needed outcome with available product controls, the legal and contact pathways should indicate the next appropriate route.',
        ],
      },
    ],
  },
  safety: {
    slug: 'safety',
    eyebrow: 'Documentation',
    title: 'Safety and trust documentation',
    description: 'A practical guide to moderation expectations, reporting, escalations, and how Waslmedia protects product quality.',
    updatedAt: 'April 2, 2026',
    lead:
      'Safety is both a policy matter and an operational matter. Waslmedia’s public documentation should help users understand not only what is allowed, but how the platform thinks about reporting, escalation, advertiser safety, and repeat harm prevention.',
    sections: [
      {
        id: 'rules',
        title: 'Rules, standards, and user expectations',
        kicker: 'Standards',
        paragraphs: [
          'Community standards exist to preserve user safety, platform trust, and advertiser confidence. The documentation should reinforce that safety rules are not decorative; they directly shape enforcement, support responses, and eligibility decisions.',
          'Users should pair this documentation with the formal community guidelines for the definitive public policy baseline.',
          'Core baseline rules include no copyrighted material without permission, no adult or illegal content, no exploitative or harmful uploads, and no attempts to evade enforcement after a prior restriction.',
        ],
      },
      {
        id: 'reporting',
        title: 'Reporting and escalation pathways',
        kicker: 'Reporting',
        paragraphs: [
          'Good reporting depends on clarity. Users should be encouraged to identify the kind of concern involved, the content or account at issue, and the relevant rule or risk where possible. Better reports improve review quality.',
          'The public surface should help users understand when an issue is best treated as a support request, a policy report, an advertiser concern, or a privacy question.',
          `Reports involving copyright, unlawful material, adult content, impersonation, or other harmful uploads should be sent through the reporting and support channels described on the site. Waslmedia may restrict access first and complete a fuller review or takedown process afterward where appropriate.`,
        ],
      },
      {
        id: 'ads',
        title: 'Advertiser and brand safety',
        kicker: 'Brand safety',
        paragraphs: [
          'Advertiser trust depends on more than campaign tooling. It depends on the platform demonstrating that unsafe content, deceptive behavior, and repeated policy issues are taken seriously.',
          'That is why ad review, community rules, and policy pages should be connected rather than presented as unrelated systems.',
        ],
      },
      {
        id: 'culture',
        title: 'Safety as a product culture, not a hidden system',
        kicker: 'Product culture',
        paragraphs: [
          'When public documentation is clear, users understand that trust and safety are active product responsibilities rather than invisible internal processes. That clarity supports healthier behavior and more realistic expectations.',
          'Waslmedia’s goal is to make the rules visible enough that people know what kind of platform they are entering before something goes wrong.',
        ],
      },
    ],
  },
};

export const legalPages: Record<string, PublicArticle> = {
  terms: {
    slug: 'terms',
    eyebrow: 'Legal',
    title: 'Terms of Service',
    description: 'The formal rules that govern access to Waslmedia, account usage, sponsored advertising purchases, and platform participation.',
    updatedAt: 'April 2, 2026',
    lead:
      'These Terms of Service explain the baseline rules for accessing and using Waslmedia. They are intended to set expectations for users of the product as well as advertisers purchasing sponsored placements on Waslmedia.',
    sections: [
      {
        id: 'scope',
        title: 'Scope and acceptance',
        kicker: 'Applicability',
        paragraphs: [
          'By accessing Waslmedia, creating an account, purchasing advertising services, or otherwise interacting with public or authenticated services, a user agrees to these terms and to the related policies referenced throughout the platform.',
          'Waslmedia may update these terms from time to time. Continued use after an effective update constitutes acceptance of the revised terms to the extent permitted by law.',
          'For payment and merchant-review purposes, Waslmedia’s primary commercial offer is sponsored advertising placements on Waslmedia itself. Paid campaign video uploads are creative assets used for ad delivery, not a separate video-hosting purchase.',
        ],
      },
      {
        id: 'accounts',
        title: 'Accounts, eligibility, and security',
        kicker: 'Accounts',
        paragraphs: [
          'Users are responsible for providing accurate account information, safeguarding access credentials, and ensuring that activity on their account complies with platform rules. Accounts may not be used to impersonate others, evade enforcement, or misrepresent identity.',
          'Waslmedia may suspend, restrict, or terminate access where account behavior creates risk to the platform, its users, or advertisers, including repeated policy violations or deceptive conduct.',
        ],
      },
      {
        id: 'content',
        title: 'User content, rights, and platform licenses',
        kicker: 'Content',
        paragraphs: [
          'Users retain responsibility for the content they upload, publish, submit, or otherwise make available on Waslmedia. Users must have the necessary rights, permissions, and authority to publish that content on the platform.',
          'By publishing content, users grant Waslmedia the rights reasonably necessary to host, process, display, distribute, secure, and operate that content within the platform and related services, subject to applicable law and the platform’s policies.',
        ],
      },
      {
        id: 'commercial',
        title: 'Advertising purchases and commercial activity',
        kicker: 'Commercial use',
        paragraphs: [
          'Advertisers, sponsors, and other commercial actors must comply with Waslmedia’s advertising documentation, cancellation and refund rules, fulfilment guidance, and ads policy. Approval of a campaign or asset is not guaranteed merely because submission or payment was technically successful.',
          'Advertising payments on Waslmedia are for managed sponsored placements on Waslmedia itself. They are not creator payouts, sub-merchant settlements, software licensing payments, or premium-plan purchases.',
          'Unless applicable law requires otherwise, captured ad payments are generally final. If Waslmedia rejects a campaign before delivery or cannot proceed for a platform-side reason, Waslmedia may satisfy the commercial remedy through Waslmedia Wallet credit instead of returning funds to the original payment method.',
        ],
      },
      {
        id: 'enforcement',
        title: 'Enforcement, suspension, and termination',
        kicker: 'Enforcement',
        paragraphs: [
          'Waslmedia may investigate suspected misuse, policy violations, fraud, abuse, or operational risk and may take action that includes content restriction, feature limitation, account suspension, advertiser rejection, or service termination.',
          'Enforcement decisions may take platform safety, user protection, legal obligations, advertiser safety, and repeated conduct patterns into account. Related guidance is provided in the community, ads, privacy, and AI policies where relevant.',
        ],
      },
      {
        id: 'rights-and-takedowns',
        title: 'Rights, permissions, and takedowns',
        kicker: 'Intellectual property',
        paragraphs: [
          'Users may not upload, publish, or reuse copyrighted material, trademarks, brand assets, music, footage, or other protected works unless they have the necessary rights or permission to do so.',
          `If Waslmedia receives a credible infringement complaint or otherwise determines that content appears unauthorized, Waslmedia may restrict access, remove the material, or take down the related account content while the issue is reviewed. Follow-up notices and rights-related requests should be sent to ${merchantSupportEmail}.`,
        ],
      },
      {
        id: 'illegal-and-adult-content',
        title: 'Illegal, adult, and exploitative content',
        kicker: 'Restricted content',
        paragraphs: [
          'Users may not use Waslmedia for illegal content, sexual or adult material, exploitative uploads, content that endangers minors, or other material that creates serious safety, legal, or platform-risk concerns.',
          'Waslmedia may remove such content without prior notice, cooperate with lawful obligations where required, and permanently restrict repeat or severe violators.',
        ],
      },
    ],
  },
  privacy: {
    slug: 'privacy',
    eyebrow: 'Legal',
    title: 'Privacy Policy',
    description: 'How Waslmedia collects, uses, stores, and shares personal information across the platform and related services.',
    updatedAt: 'April 2, 2026',
    lead:
      'This Privacy Policy explains the categories of personal data Waslmedia may collect, the purposes for which that data may be used, the circumstances under which it may be shared, and the controls available to users and advertisers interacting with Waslmedia.',
    sections: [
      {
        id: 'collection',
        title: 'Information Waslmedia may collect',
        kicker: 'Collection',
        paragraphs: [
          'Waslmedia may collect information provided directly by users, such as account details, profile information, channel information, uploaded content, support submissions, and advertiser campaign materials.',
          'The platform may also collect usage and device information needed to operate services, secure accounts, measure product performance, manage recommendations, prevent abuse, and support lawful business and compliance purposes.',
        ],
        bullets: [
          'Account and profile information',
          'Channel and content metadata',
          'Usage, device, and interaction data',
          'Support, safety, and advertiser workflow data',
        ],
      },
      {
        id: 'use',
        title: 'How information may be used',
        kicker: 'Use',
        paragraphs: [
          'Waslmedia may use information to provide platform functionality, maintain security, personalize relevant experiences, improve product quality, support creators and advertisers, respond to support requests, and comply with legal obligations.',
          'Where AI-assisted systems are involved, Waslmedia intends to describe those uses publicly and govern them alongside product, privacy, and AI policy expectations.',
        ],
      },
      {
        id: 'sharing',
        title: 'Sharing and disclosure',
        kicker: 'Disclosure',
        paragraphs: [
          'Waslmedia does not sell personal data. It also does not share user data with other companies for their own advertising, profiling, resale, or unrelated commercial use.',
          'Limited disclosure may still occur where it is necessary to host, secure, operate, measure, or support Waslmedia through service providers and infrastructure tools, or where disclosure is legally required, needed to protect rights and safety, or necessary to investigate abuse or fraud.',
        ],
      },
      {
        id: 'retention',
        title: 'Retention and storage',
        kicker: 'Retention',
        paragraphs: [
          'Data may be retained for as long as reasonably necessary to provide services, maintain records, support trust and safety operations, resolve disputes, enforce agreements, or comply with legal obligations.',
          'Retention periods may vary depending on the type of data, the workflow involved, the sensitivity of the information, and the applicable operational or legal requirements.',
        ],
      },
      {
        id: 'rights',
        title: 'Controls and user choices',
        kicker: 'User choices',
        paragraphs: [
          'Users may have access to controls inside the product, including settings related to profile information, history, and other account-facing preferences. Additional privacy and data rights may apply depending on the user’s jurisdiction.',
          'Public guidance on product-facing controls is available through the data-controls documentation. This policy remains the legal explanation of Waslmedia’s data practices.',
        ],
      },
    ],
  },
  refunds: {
    slug: 'refunds',
    eyebrow: 'Legal',
    title: 'Cancellation and Refunds',
    description: 'How final ad payments, wallet-credit outcomes, and campaign cancellation requests are handled.',
    updatedAt: 'April 3, 2026',
    lead:
      'Waslmedia sells digital advertising services. Ad payments are generally final once captured. If Waslmedia rejects a campaign before delivery or cannot proceed for a platform-side reason, the default remedy is Waslmedia Wallet credit rather than an automatic return to the original payment method.',
    sections: [
      {
        id: 'finality',
        title: 'Ad payments are generally final',
        kicker: 'Final payment policy',
        paragraphs: [
          'Ad purchases are generally treated as final once payment has been captured. Payment does not guarantee automatic launch, because campaigns remain subject to review, fulfilment readiness, and policy fit.',
          'An advertiser should only pay when ready to proceed with a managed ad campaign on Waslmedia under the public advertising and policy rules.',
        ],
      },
      {
        id: 'wallet-credit',
        title: 'When Waslmedia Wallet credit is used instead',
        kicker: 'Wallet credit',
        paragraphs: [
          'If Waslmedia rejects a campaign before delivery begins, cancels it for a platform-side reason, or determines that the campaign cannot proceed on eligible Waslmedia inventory, Waslmedia generally applies the amount as Waslmedia Wallet credit.',
          'Wallet credit can be used toward future eligible purchases on Waslmedia, including later advertising purchases and any other wallet-eligible Waslmedia purchases if such eligibility is introduced in the future.',
          'Wallet-credit handling keeps campaign accounting and later reuse clearer than issuing one-off reversals in every case.',
        ],
      },
      {
        id: 'non-refundable',
        title: 'When refunds may not be available',
        kicker: 'Limitations',
        paragraphs: [
          'Once campaign delivery has started, cash refunds are generally not available except where applicable law requires otherwise.',
          'Policy violations, misleading materials, incomplete campaign setup, unsupported claims, or other advertiser-side issues may limit or remove eligibility for any wallet-credit adjustment depending on the circumstances.',
          'Wallet credit is generally non-transferable and not redeemable for cash except where applicable law requires otherwise.',
        ],
      },
      {
        id: 'requests',
        title: 'How to request follow-up',
        kicker: 'Contact',
        paragraphs: [
          `Cancellation or payment follow-up should be sent to ${merchantSupportEmail} with the campaign context, payment context, and the exact reason for the request.`,
          `${merchantBusinessName} generally aims to respond within ${merchantResponseTime}, although complex payment, review, or wallet-credit matters may take longer when additional verification is required.`,
        ],
      },
    ],
  },
  'service-fulfilment': {
    slug: 'service-fulfilment',
    eyebrow: 'Legal',
    title: 'Service Fulfilment and No Shipping',
    description: 'How Waslmedia fulfils digital advertising services and why no physical shipping applies.',
    updatedAt: 'April 3, 2026',
    lead:
      'Waslmedia provides digital advertising services. No physical goods are shipped. Fulfilment happens through campaign setup, review, approval, and ad delivery on Waslmedia.',
    sections: [
      {
        id: 'scope',
        title: 'What fulfilment means on Waslmedia',
        kicker: 'Fulfilment scope',
        paragraphs: [
          'Fulfilment refers to the managed campaign process: receiving the advertiser request, reviewing the campaign, approving eligible creative, and delivering the sponsored placement on Waslmedia.',
          'Because the service is digital and on-platform, fulfilment is operational rather than logistical. There is no warehouse, courier, or physical shipment involved.',
        ],
      },
      {
        id: 'timing',
        title: 'Delivery timing and readiness',
        kicker: 'Timing',
        paragraphs: [
          'Campaign timing depends on readiness, policy review, placement availability, and whether the advertiser has provided the necessary creative and campaign context.',
          'Payment does not by itself guarantee immediate delivery. Campaigns remain subject to review and operational scheduling before they go live. Waslmedia generally aims to complete review within 2-3 days, although exceptions can take longer.',
          'If Waslmedia determines before launch that a campaign cannot proceed, the default commercial outcome is Waslmedia Wallet credit under the refunds policy rather than an automatic cash refund.',
        ],
      },
      {
        id: 'shipping',
        title: 'No physical shipping',
        kicker: 'Shipping',
        paragraphs: [
          'Waslmedia does not sell physical goods through this advertising workflow, so shipping, courier, and physical-delivery policies do not apply.',
          'All merchant fulfilment under this advertising offer occurs digitally on Waslmedia-owned surfaces.',
        ],
      },
      {
        id: 'support',
        title: 'Support for fulfilment questions',
        kicker: 'Support',
        paragraphs: [
          `Questions about campaign status, review, fulfilment timing, or ad delivery should be sent to ${merchantSupportEmail}.`,
          `Waslmedia generally aims to respond within ${merchantResponseTime}.`,
        ],
      },
    ],
  },
  cookies: {
    slug: 'cookies',
    eyebrow: 'Legal',
    title: 'Cookies Policy',
    description: 'How Waslmedia uses cookies, similar technologies, and local storage across public and authenticated surfaces.',
    updatedAt: 'April 2, 2026',
    lead:
      'Waslmedia may use cookies, local storage, session technologies, and similar tools to support product operation, security, sign-in continuity, analytics, and user experience consistency.',
    sections: [
      {
        id: 'what',
        title: 'What these technologies are',
        kicker: 'Definitions',
        paragraphs: [
          'Cookies and similar technologies are small data mechanisms stored in the browser or device context that allow services to remember state, preserve sessions, measure interactions, and support core functionality.',
          'Waslmedia may use both short-lived and longer-duration technologies depending on the workflow involved and the operational purpose being served.',
        ],
      },
      {
        id: 'why',
        title: 'Why Waslmedia uses them',
        kicker: 'Purpose',
        paragraphs: [
          'Some cookie and storage use is strictly necessary to keep the platform functioning, such as maintaining session state, preserving security context, and reducing abuse or fraud risk. Other uses may support measurement, product diagnostics, or experience continuity.',
          'The platform does not treat all technologies as equivalent. A sign-in session mechanism serves a different role than a diagnostic or measurement tool.',
        ],
      },
      {
        id: 'controls',
        title: 'User controls and limitations',
        kicker: 'Controls',
        paragraphs: [
          'Users may manage certain browser-level cookie settings through their browser controls, but disabling some technologies may affect sign-in continuity, experience stability, or feature availability.',
          'Where in-product controls exist, those controls should be used alongside browser tools rather than assumed to replace them entirely.',
        ],
      },
    ],
  },
  'data-policy': {
    slug: 'data-policy',
    eyebrow: 'Legal',
    title: 'Data Policy',
    description: 'A more operational explanation of Waslmedia’s data stewardship, retention, access, and governance practices.',
    updatedAt: 'April 2, 2026',
    lead:
      'This Data Policy complements the Privacy Policy by focusing on how Waslmedia thinks about data stewardship operationally: collection discipline, access boundaries, retention logic, and the relationship between product functionality and data governance.',
    sections: [
      {
        id: 'governance',
        title: 'Data governance principles',
        kicker: 'Governance',
        paragraphs: [
          'Waslmedia aims to collect and retain data in a way that supports product operation, security, support, and platform trust without turning governance into an afterthought. Data decisions should be tied to identifiable product, legal, or operational needs.',
          'The platform is privately run and independently developed, so its public data position is meant to stay simple: collect what is needed to operate Waslmedia responsibly, do not sell user data, and do not turn personal information into a separate trading asset.',
        ],
      },
      {
        id: 'access',
        title: 'Access and internal use boundaries',
        kicker: 'Access',
        paragraphs: [
          'Access to data should be limited according to operational role, workflow necessity, and platform risk. Not every internal workflow should have the same level of visibility into user or advertiser information.',
          'Support, moderation, finance, advertiser operations, and engineering workflows may involve different data needs and therefore different access expectations.',
        ],
        bullets: [
          'Waslmedia does not sell personal data.',
          'Waslmedia does not share user data with outside companies for their own marketing or resale.',
          'Outside services may process limited data only where needed to run the platform, secure accounts, or meet legal obligations.',
        ],
      },
      {
        id: 'retention',
        title: 'Retention logic and deletion context',
        kicker: 'Retention logic',
        paragraphs: [
          'Retention depends on why the data exists, how sensitive it is, whether it is tied to safety or legal obligations, and whether the product still needs it to serve a legitimate purpose.',
          'Deletion should not be understood as a single universal action. Some data may be deletable by the user directly, while other data may be subject to operational, security, fraud, or compliance-related retention constraints.',
        ],
      },
      {
        id: 'requests',
        title: 'Requests, controls, and formal handling',
        kicker: 'Requests',
        paragraphs: [
          'Where users have access to direct controls, those should be the first route. Where they require formal privacy or governance handling, the request should be evaluated against applicable laws, product realities, and documented policy commitments.',
          'This page should be read together with the Privacy Policy and the data-controls documentation so that legal disclosure and product behavior can be understood together.',
        ],
      },
    ],
  },
  'ads-policy': {
    slug: 'ads-policy',
    eyebrow: 'Legal',
    title: 'Advertising Policy',
    description: 'The rules, restrictions, and review standards that govern advertising on Waslmedia.',
    updatedAt: 'April 2, 2026',
    lead:
      'This Advertising Policy explains the standards that apply to advertiser campaigns, sponsored materials, commercial claims, and the review process for paid promotional content on Waslmedia.',
    sections: [
      {
        id: 'eligibility',
        title: 'Advertiser eligibility and review expectations',
        kicker: 'Eligibility',
        paragraphs: [
          'Participation in Waslmedia advertising is subject to review, eligibility, and policy alignment. Technical submission does not guarantee campaign approval, continued delivery, or future account eligibility.',
          'Waslmedia may request additional context, reject creative assets, limit delivery, or restrict advertiser access where campaign behavior or category risk warrants additional scrutiny.',
          'A rejection does not by itself guarantee a cash refund. Commercial handling follows the public refunds policy, including Waslmedia Wallet credit where applicable.',
        ],
      },
      {
        id: 'prohibited',
        title: 'Prohibited and restricted categories',
        kicker: 'Restrictions',
        paragraphs: [
          'Advertising content that is deceptive, unlawful, unsafe, exploitative, harmful, manipulative, or otherwise inconsistent with platform standards may be rejected or removed. Some categories may be fully prohibited; others may be restricted or require additional review.',
          'Advertisers are expected to understand not only whether a category is permitted, but whether the campaign is appropriate for the platform’s audience, trust model, and brand safety expectations.',
        ],
      },
      {
        id: 'claims',
        title: 'Claims, substantiation, and landing experiences',
        kicker: 'Claims',
        paragraphs: [
          'Commercial claims must be supportable, clear, and not materially misleading. Claims made in creative assets should remain consistent with the landing experience and any supporting materials connected to the campaign.',
          'Waslmedia may take a broader view of misleading behavior than merely checking whether a sentence is technically worded. The overall impression of the campaign matters.',
        ],
      },
      {
        id: 'enforcement',
        title: 'Enforcement and advertiser account consequences',
        kicker: 'Enforcement',
        paragraphs: [
          'Violations of this policy may result in asset rejection, campaign pause, delivery restriction, account review, account suspension, or permanent loss of advertiser eligibility.',
          'Repeat issues, evasive conduct, or patterns of unsafe or deceptive commercial behavior may result in stronger enforcement than a single isolated issue.',
        ],
      },
    ],
  },
  'community-guidelines': {
    slug: 'community-guidelines',
    eyebrow: 'Legal',
    title: 'Community Guidelines',
    description: 'The standards that apply to content, conduct, reporting, and platform participation across Waslmedia.',
    updatedAt: 'April 2, 2026',
    lead:
      'Waslmedia’s Community Guidelines are intended to protect viewers, creators, advertisers, and the platform itself. They explain what kinds of content and behavior are not acceptable and how the platform approaches enforcement.',
    sections: [
      {
        id: 'conduct',
        title: 'User conduct and platform behavior',
        kicker: 'Conduct',
        paragraphs: [
          'Users may not use Waslmedia to harass, abuse, impersonate, defraud, manipulate, or otherwise harm other users, creators, advertisers, or the integrity of the platform.',
          'Conduct on Waslmedia is not evaluated only by isolated statements. Repeated patterns, coordinated misuse, evasion, and the broader safety context may all inform enforcement.',
        ],
      },
      {
        id: 'content',
        title: 'Content standards',
        kicker: 'Content',
        paragraphs: [
          'Content that is harmful, illegal, deceptive, exploitative, or otherwise inconsistent with platform safety and trust expectations may be restricted or removed. Waslmedia may consider context, severity, repetition, and audience impact when evaluating content.',
          'Creators are responsible for understanding that publication rights are not the same thing as platform eligibility. Content can be technically uploadable and still violate platform standards.',
        ],
      },
      {
        id: 'copyright',
        title: 'Copyright and permission-based publishing',
        kicker: 'Rights',
        paragraphs: [
          'Users must not publish copyrighted material, clips, music, footage, or other protected content unless they have permission or another valid legal right to use it.',
          `Waslmedia may restrict, remove, or take down allegedly infringing content while it is reviewed. Rights-holder complaints and follow-up notices can be sent to ${merchantSupportEmail}.`,
        ],
      },
      {
        id: 'adult-illegal',
        title: 'Adult, illegal, and high-risk content',
        kicker: 'Safety restrictions',
        paragraphs: [
          'Adult sexual content, unlawful material, exploitative content, and other severe safety risks are not allowed on Waslmedia.',
          'Waslmedia may remove such material immediately, restrict the account involved, and preserve information needed for safety or legal follow-up where appropriate.',
        ],
      },
      {
        id: 'reporting',
        title: 'Reports, review, and enforcement',
        kicker: 'Review',
        paragraphs: [
          'Waslmedia may review reported content, user behavior, advertiser materials, or linked conduct patterns when assessing platform risk. Enforcement may range from warnings and restrictions to suspension or termination depending on severity and repetition.',
          'Users should provide clear reports tied to the actual content or behavior at issue. Better reports improve review quality and reduce uncertainty during moderation.',
          'Reporting should cover copyright complaints, illegal or adult content, impersonation, safety threats, fraud, and other policy violations, so Waslmedia can decide whether to restrict, remove, or permanently take down the material.',
        ],
      },
      {
        id: 'integrity',
        title: 'Platform integrity and misuse',
        kicker: 'Integrity',
        paragraphs: [
          'Attempts to game the platform, evade prior enforcement, manipulate engagement, mislead users, or create fraudulent commercial or content activity may be treated as integrity violations even when individual actions appear minor in isolation.',
          'Waslmedia may take preventive action where continued access creates material trust or safety risk.',
        ],
      },
    ],
  },
  'ai-policy': {
    slug: 'ai-policy',
    eyebrow: 'Legal',
    title: 'AI Policy',
    description: 'The formal policy that explains how Waslmedia may use AI, what protections apply, and where human oversight remains required.',
    updatedAt: 'April 2, 2026',
    lead:
      'This AI Policy explains Waslmedia’s public position on the use of artificial intelligence in product experiences, internal tooling, assistance workflows, and related governance processes.',
    sections: [
      {
        id: 'scope',
        title: 'Scope of AI usage',
        kicker: 'Scope',
        paragraphs: [
          'Waslmedia may use AI in selected product or operational contexts such as assistance, workflow acceleration, or internal support systems. AI usage is expected to be bounded by product design, governance standards, and public disclosure obligations.',
          'This policy does not imply that AI is used in every product feature or that automated systems act as final authority in all decisions.',
        ],
      },
      {
        id: 'responsibility',
        title: 'Human oversight and responsibility',
        kicker: 'Oversight',
        paragraphs: [
          'Human oversight remains important where decisions could materially affect safety, enforcement, support quality, advertiser treatment, or user rights. AI assistance should not be treated as a blanket substitute for human judgment in sensitive matters.',
          'Users remain responsible for reviewing AI-generated assistance they rely on for publishing, operational, or commercial decisions.',
        ],
      },
      {
        id: 'limitations',
        title: 'Limitations, bias, and error risk',
        kicker: 'Limitations',
        paragraphs: [
          'AI outputs may be incomplete, incorrect, biased, overly confident, or otherwise unsuitable for direct adoption without review. Waslmedia expects users and internal operators to account for these limitations rather than assuming AI output is authoritative.',
          'Where AI-assisted tooling is surfaced publicly, Waslmedia should provide enough context that users can interpret the output responsibly.',
        ],
      },
      {
        id: 'governance',
        title: 'Data handling and governance alignment',
        kicker: 'Governance alignment',
        paragraphs: [
          'AI-related processing should remain aligned with Waslmedia’s privacy, data, and security obligations. AI use is not exempt from the broader governance standards that apply to the platform.',
          'Users seeking a fuller view of how data is handled should also review the Privacy Policy, Data Policy, and documentation pages addressing data controls and AI usage.',
        ],
      },
    ],
  },
};
