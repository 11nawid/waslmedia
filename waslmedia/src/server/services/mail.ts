import { getAppBaseUrl, getSmtpRuntimeConfig } from '@/server/utils/runtime-config';
import { sendSmtpMail } from '@/server/utils/smtp';

export async function sendAdRejectedEmail(input: {
  to: string;
  campaignTitle: string;
  reasonLabel: string;
  customReason?: string | null;
}) {
  const smtp = getSmtpRuntimeConfig();
  if (!smtp.enabled || !smtp.configured) {
    return { attempted: false, delivered: false, reason: 'SMTP_DISABLED' as const };
  }

  const baseUrl = getAppBaseUrl();
  const detailsUrl = `${baseUrl}/studio/ads`;
  const reasonBlock = input.customReason?.trim()
    ? `${input.reasonLabel}\n\n${input.customReason.trim()}`
    : input.reasonLabel;

  await sendSmtpMail(
    {
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      user: smtp.user,
      password: smtp.password,
      fromEmail: smtp.fromEmail,
      fromName: smtp.fromName,
      replyTo: smtp.replyTo,
    },
    {
      to: input.to,
      subject: `Your Waslmedia ad was rejected`,
      text: [
        `Your ad "${input.campaignTitle}" was rejected by the Waslmedia review team.`,
        '',
        'Reason:',
        reasonBlock,
        '',
        `Open Studio Ads for the full details and next steps: ${detailsUrl}`,
      ].join('\n'),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
          <h2 style="margin-bottom:12px">Your Waslmedia ad was rejected</h2>
          <p>Your ad <strong>${escapeHtml(input.campaignTitle)}</strong> was rejected by the Waslmedia review team.</p>
          <p><strong>Reason:</strong><br/>${escapeHtml(input.reasonLabel)}</p>
          ${
            input.customReason?.trim()
              ? `<p><strong>Details:</strong><br/>${escapeHtml(input.customReason.trim()).replace(/\n/g, '<br/>')}</p>`
              : ''
          }
          <p><a href="${detailsUrl}" style="display:inline-block;background:#ff3d3d;color:white;padding:10px 16px;border-radius:999px;text-decoration:none">Open Studio Ads</a></p>
        </div>
      `,
    }
  );

  return { attempted: true, delivered: true };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
