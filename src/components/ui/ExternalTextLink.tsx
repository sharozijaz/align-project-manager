import type { MouseEvent, ReactNode } from "react";
import { openExternalUrl } from "../../integrations/desktop/runtime";

export function ExternalTextLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  const openLink = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    void openExternalUrl(href, { browserMode: "new-tab" }).catch(() => {});
  };

  return (
    <a className={className} href={href} target="_blank" rel="noopener noreferrer" onClick={openLink}>
      {children}
    </a>
  );
}
