import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { ArrowRight } from "lucide-react";

interface BentoGridProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode;
  className?: string;
}

interface BentoCardProps extends ComponentPropsWithoutRef<"div"> {
  name: string;
  className: string;
  background: ReactNode;
  Icon: React.ElementType;
  description: string;
  cta?: string;
  href?: string;
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-[22rem] grid-cols-3 gap-4",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  ...props
}: BentoCardProps) => (
  <div
    key={name}
    className={cn(
      "group relative col-span-3 flex flex-col justify-between overflow-hidden rounded-sm",
      "transform-gpu dark:bg-background dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]",
      className,
    )}
    {...props}
  >
    <div>{background}</div>
    <div
      className={cn(
        "pointer-events-none z-10 flex transform-gpu flex-col gap-1 p-6 transition-all duration-300 ",
        {
          "group-hover:-translate-y-10": cta,
        },
      )}
    >
      <Icon
        className={cn(
          "size-9 origin-left transform-gpu transition-all duration-300 ease-in-out mb-2",
          {
            "group-hover:scale-90": cta,
          },
        )}
      />
      <h3 className="text-xl font-semibold text-foreground/80">{name}</h3>
      <p className="max-w-lg text-muted-foreground">{description}</p>
    </div>
    {cta ? (
      <div
        className={cn(
          "pointer-events-none absolute bottom-0 flex w-full translate-y-10 transform-gpu flex-row items-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100",
        )}
      >
        <Button
          variant="ghost"
          asChild
          size="sm"
          className="pointer-events-auto"
        >
          <a href={href}>
            {cta}
            <ArrowRight className="ms-2 h-4 w-4 rtl:rotate-180" />
          </a>
        </Button>
      </div>
    ) : null}
    <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 bg-black/10 group-hover:dark:bg-black/20" />
  </div>
);

export { BentoCard, BentoGrid };
