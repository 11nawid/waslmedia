import { permanentRedirect } from 'next/navigation';

export default async function DocsArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  permanentRedirect(`/help-center/docs/${slug}`);
}
