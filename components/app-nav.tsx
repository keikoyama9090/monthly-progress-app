"use client";

import { useSession, signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

type ActivePage = "home" | "clients" | "withholding";

type Props = {
  active: ActivePage;
};

const NAV_LINKS = [
  { key: "clients"     as const, href: "/clients",     label: "クライアント" },
  { key: "home"        as const, href: "/",            label: "月次進捗" },
  { key: "withholding" as const, href: "/withholding", label: "源泉税納付" },
];

export function AppNav({ active }: Props) {
  return (
    <nav className="flex items-stretch gap-0.5">
      {NAV_LINKS.map(({ key, href, label }) =>
        key === active ? (
          <span
            key={key}
            className={cn(
              "flex items-center px-3 text-sm font-medium border-b-2",
              "text-primary border-primary"
            )}
          >
            {label}
          </span>
        ) : (
          <a
            key={key}
            href={href}
            className="flex items-center px-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border-b-2 border-transparent"
          >
            {label}
          </a>
        )
      )}
    </nav>
  );
}

export function UserMenu() {
  const { data: session } = useSession();
  if (!session?.user) return null;

  return (
    <div className="flex items-center gap-3 pl-4 border-l border-border">
      <span className="text-xs text-muted-foreground truncate max-w-[160px]">
        {session.user.email}
      </span>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        title="ログアウト"
      >
        <LogOut className="size-3.5" />
        ログアウト
      </button>
    </div>
  );
}

export function AppLogo() {
  return (
    <div className="flex items-center gap-3 pr-6 border-r border-border">
      <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center shrink-0">
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className="w-3.5 h-3.5 text-primary-foreground"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="2" width="5" height="5" rx="0.5" />
          <rect x="9" y="2" width="5" height="5" rx="0.5" />
          <rect x="2" y="9" width="5" height="5" rx="0.5" />
          <rect x="9" y="9" width="5" height="5" rx="0.5" />
        </svg>
      </div>
    </div>
  );
}
