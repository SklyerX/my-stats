import { buttonVariants } from "@workspace/ui/components/button";
import Link from "next/link";
import React from "react";
import { FaGithub } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

const sections = [
  {
    title: "Legal",
    links: [
      { name: "Privacy Policy", href: "/privacy" },
      { name: "Terms of Services", href: "/terms" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-card border-t py-10">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-y-8 gap-x-2 w-full">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-xl font-semibold">{section.title}</h2>
              <div className="flex flex-col gap-2 mt-3">
                {section.links.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-muted-foreground/80 transition-colors"
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 flex items-center justify-between">
          <div>
            With with ❤️ by{" "}
            <Link href="https://skylerx.ir" className="text-primary underline">
              SkylerX
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="https://github.com/SkylerX/my-stats">
              <FaGithub className="size-6" />
            </Link>
            <Link href="https://x.com/cosmik_x">
              <FaXTwitter className="size-6" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
