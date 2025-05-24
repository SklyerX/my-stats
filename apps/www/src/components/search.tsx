"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { useIsMobile } from "@workspace/ui/hooks/use-mobile";
import { cn } from "@workspace/ui/lib/utils";
import { SearchIcon, Send } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function Search() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [query, setQuery] = useState<string>(searchParams.get("q") ?? "");
  const [open, setOpen] = useState<boolean>(false);
  const isMobile = useIsMobile(640);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  useEffect(() => {
    setOpen(false);
  }, [pathname, searchParams]);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger className="block sm:hidden" asChild>
          <SearchIcon className="size-6" />
        </DialogTrigger>
        <DialogContent>
          <SearchInput
            value={query}
            onChange={({ target }) => setQuery(target.value)}
            onKeyDown={handleKeyDown}
            placeholder="search"
          />
          <Button
            variant="outline"
            onClick={() =>
              router.push(`/search?q=${encodeURIComponent(query)}`)
            }
          >
            Search <Send className="size-4" />
          </Button>
        </DialogContent>
      </Dialog>
      <SearchInput
        className="hidden sm:block"
        showIcon={!isMobile}
        value={query}
        onChange={({ target }) => setQuery(target.value)}
        onKeyDown={handleKeyDown}
        placeholder="search"
      />
    </>
  );
}

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  showIcon?: boolean;
}

function SearchInput({
  showIcon = true,
  className,
  ...props
}: SearchInputProps) {
  return (
    <div className="relative">
      <Input
        className={cn(
          "ps-9 bg-muted border-transparent shadow-none",
          className,
        )}
        {...props}
      />
      {showIcon ? (
        <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
          <SearchIcon className="size-4" />
        </div>
      ) : null}
    </div>
  );
}
