import { permanentRedirect } from 'next/navigation';

export default async function LegalArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  permanentRedirect(`/help-center/legal/${slug}`);
}
