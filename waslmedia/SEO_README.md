# Waslmedia SEO Inspection Guide

This guide lists the URLs that should be submitted to Google Search Console and Bing Webmaster Tools after deployment.

## Before submitting URLs

- Confirm the live production domain is the same domain configured in `NEXT_PUBLIC_APP_BASE_URL`.
- Confirm [robots.txt](/robots.txt) and [sitemap.xml](/sitemap.xml) load publicly without login.
- Confirm Cloudflare or any other security layer is not challenging verified search crawlers on public pages.
- Confirm the public pages below return `200` and do not redirect to login.

## Submit these core URLs first

- `/`
- `/shorts`
- `/trending`
- `/help-center`
- `/help-center/company/about`
- `/help-center/contact`
- `/help-center/docs/advertise`
- `/help-center/docs/advertising`
- `/help-center/legal/terms`
- `/help-center/legal/privacy`
- `/help-center/legal/refunds`
- `/help-center/legal/service-fulfilment`
- `/help-center/legal/ads-policy`

## Submit the sitemap

- Submit `/sitemap.xml` in Google Search Console.
- Submit `/sitemap.xml` in Bing Webmaster Tools.
- Re-submit the sitemap after major public-content launches if indexing looks slow.

## Channel SEO

- The canonical public channel URL is the handle route, for example `/@afnawid`.
- Do not submit legacy `/channel/<id>` or `/channel/@handle` URLs for indexing when the handle URL exists.
- Inspect important channels individually after:
  - first public launch
  - major profile updates
  - handle changes
  - adding a meaningful amount of public content

## Video SEO

- The canonical video page is `/watch/<video-id>`.
- Shorts can also appear on `/shorts/<video-id>`, but the full watch page should still be treated as the main public video URL unless you intentionally want the Shorts page inspected too.
- Inspect important videos after publishing, especially launch videos, brand videos, and evergreen videos you want indexed quickly.

## Recommended inspection order for new launches

1. Home page
2. Help center and legal pages
3. Main channel pages
4. Important video pages
5. Important Shorts pages

## URLs that should not be submitted

- `/login`
- `/signup`
- `/signup/success`
- `/search`
- `/studio/...`
- `/api/...`
- `/feedback`
- `/history`
- `/liked`
- `/watch-later`
- `/your-videos`
- `/your-data`

## Search ranking expectations

- Submitting a URL does not guarantee indexing or ranking.
- Channels and videos rank better when the title, public description, thumbnail, and internal linking are clear and stable.
- If you want a channel to rank by name, make sure the channel name is used consistently in:
  - the public handle
  - the channel page title
  - the public description
  - linked videos and help-center references where appropriate

## After each major release

- Test `/robots.txt`
- Test `/sitemap.xml`
- Inspect the home page
- Inspect one channel URL
- Inspect one watch URL
- Inspect one Shorts URL
- Check that private pages still return `noindex`
