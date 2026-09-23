'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
        active ? 'bg-sunken text-ink' : 'text-muted hover:text-ink'
      }`}
    >
      {children}
    </Link>
  );
}
