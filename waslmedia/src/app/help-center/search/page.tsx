import { HelpCenterSearchResultsPage } from '@/components/help-center/help-center-primitives';
import { searchHelpCenterDocuments } from '@/lib/help-center-content';

export default async function HelpCenterSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = '' } = await searchParams;
  const query = q.trim();
  const results = searchHelpCenterDocuments(query).map(({ body: _body, ...document }) => document);

  return <HelpCenterSearchResultsPage query={query} results={results} />;
}
