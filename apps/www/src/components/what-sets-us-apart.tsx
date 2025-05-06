"use client";

import { cn } from "@workspace/ui/lib/utils";
import { motion } from "framer-motion";
import { ArrowUpRight, Handshake } from "lucide-react";
import Link from "next/link";
import React from "react";

const features = [
  {
    title: "Transparent Pricing",
    description:
      "No hidden fees or surprise charges. What you see is exactly what you pay, which is $0. We believe you have a right to your own data.",
    content: (
      <>
        <div className="text-7xl md:text-8xl font-bold text-amber-500 mb-4">
          0
        </div>
        <p className="text-xl text-muted-foreground">
          hidden fees or surprise charges in our pricing
        </p>
      </>
    ),
  },
  {
    title: "No Bullshit",
    description:
      "We don't like to bullshit our users with false claims, even if it means it might disappoint them. We are honest about our limitations and we don't try to sell you on features that don't exist. Unfortunately, others apps will sell you bullshit and call it truth.",
    content: (
      <>
        <div className="text-7xl md:text-8xl font-bold text-sky-500 mb-4">
          100% Honesty
        </div>
        <p className="text-xl text-muted-foreground">
          0 bullshit, 0 lies, 0 marketing tricks
        </p>
      </>
    ),
  },
  {
    title: "Open Source",
    description:
      "We don't hide our code from you. We are open source, and we are proud of it.",
    content: (
      <>
        <div className="text-7xl md:text-8xl font-bold text-emerald-500 mb-4">
          110%
        </div>
        <p className="text-xl text-muted-foreground">open sourced code.</p>
      </>
    ),
    cta: "View on GitHub",
    href: "https://github.com/SklyerX/my-stats",
  },
  {
    title: "Respect",
    description:
      "We value your time and money, we respect your rights to your own data. We don't sell your data to third parties, nor do we impose paywalls for features. We tell you facts and truths, no marketing tricks.",
    content: (
      <>
        <div className="text-7xl md:text-8xl font-bold text-rose-500 mb-4">
          <Handshake className="size-10" />
        </div>
        <p className="text-xl text-muted-foreground">
          We respect you, you respect us. It's a two-way street.
        </p>
      </>
    ),
    cta: "Read our privacy policy",
    href: "/privacy",
  },
];

export default function WhatSetsUsApart() {
  return (
    <div>
      <div className="flex flex-col md:items-center mb-16 md:mb-24">
        <h2 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
          What Sets <span className="text-rose-500">Us Apart</span>
        </h2>
        <p className="text-xl md:text-2xl md:text-center text-muted-foreground max-w-3xl">
          We don't just talk about being different. We prove it through our
          approach, technology, and results.
        </p>
      </div>

      <div className="space-y-20 md:space-y-32">
        {features.map((feature, index) => (
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.5,
              delay: index * 0.1,
              ease: "easeInOut",
            }}
            key={index}
          >
            <div
              className={cn(
                "flex flex-col items-start gap-8 md:gap-16 relative",
                index % 2 === 0 ? "md:flex-row-reverse" : "md:flex-row",
              )}
            >
              {index % 2 !== 0 && (
                <div className="absolute -left-4 top-5 text-[180px] md:text-[240px] font-bold text-muted-foreground/5 select-none pointer-events-none">
                  {0}
                  {index + 1}
                </div>
              )}

              <div className="w-full md:w-1/2 relative z-10">
                <h3 className="text-3xl md:text-5xl font-bold mb-6">
                  {feature.title}
                </h3>
                <p className="text-xl text-muted-foreground mb-8 max-w-xl">
                  {feature.description}
                </p>
                {feature.cta && (
                  <Link
                    href={feature.href}
                    className="inline-flex items-center text-rose-500 text-lg font-medium group"
                  >
                    {feature.cta}
                    <ArrowUpRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                  </Link>
                )}
              </div>

              <div className="w-full md:w-1/2 bg-card rounded-2xl p-8 md:p-12 relative z-10">
                {feature.content}
              </div>
              {index % 2 === 0 && (
                <div className="absolute -right-4 top-5 text-[180px] md:text-[240px] font-bold text-muted-foreground/5 select-none pointer-events-none">
                  {0}
                  {index + 1}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
