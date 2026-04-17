import { headers } from 'next/headers';
import { userAgent } from 'next/server';

export type RequestDeviceClass = 'mobile' | 'tablet' | 'desktop';

function classifyUserAgentString(userAgentString: string) {
  const normalized = userAgentString.toLowerCase();

  if (
    normalized.includes('ipad') ||
    normalized.includes('tablet') ||
    (normalized.includes('android') && !normalized.includes('mobile')) ||
    normalized.includes('silk')
  ) {
    return 'tablet' satisfies RequestDeviceClass;
  }

  if (
    normalized.includes('iphone') ||
    normalized.includes('ipod') ||
    normalized.includes('android') ||
    normalized.includes('mobile')
  ) {
    return 'mobile' satisfies RequestDeviceClass;
  }

  return 'desktop' satisfies RequestDeviceClass;
}

export async function getRequestDeviceClass(): Promise<RequestDeviceClass> {
  const requestHeaders = await headers();
  const ua = userAgent({ headers: requestHeaders });
  const reportedType = ua.device.type;

  if (reportedType === 'mobile') {
    return 'mobile';
  }

  if (reportedType === 'tablet') {
    return 'tablet';
  }

  const mobileClientHint = requestHeaders.get('sec-ch-ua-mobile');
  const viewportWidth = Number(requestHeaders.get('viewport-width') || 0);

  if (mobileClientHint === '?1') {
    return viewportWidth > 0 && viewportWidth >= 768 ? 'tablet' : 'mobile';
  }

  return classifyUserAgentString(requestHeaders.get('user-agent') || '');
}

export async function canManageStudioAdsOnThisDevice() {
  return (await getRequestDeviceClass()) === 'desktop';
}
