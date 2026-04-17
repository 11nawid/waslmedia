import { HelpCenterShell } from '@/components/help-center/help-center-shell';

export default function HelpCenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <HelpCenterShell>{children}</HelpCenterShell>;
}
