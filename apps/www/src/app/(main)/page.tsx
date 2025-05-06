import BentoGridSection from "@/components/bento-grid-section";
import WhatSetsUsApart from "@/components/what-sets-us-apart";
import { Particles } from "@workspace/ui/components/particles";
import { Safari } from "@workspace/ui/components/safari";
import Link from "next/link";
import { FaSpotify } from "react-icons/fa";
import { TextReveal } from "@workspace/ui/components/text-reveal";
import OpenSource from "@/components/open-source";

export default function Home() {
  return (
    <div>
      <div className="pointer-events-none absolute -right-48 top-0 -z-10 h-[15rem] w-[50rem] rotate-[32deg] rounded-[70rem] bg-[rgb(125,41,134)] opacity-25 blur-[100px] transition-colors duration-75" />
      <div className="pointer-events-none absolute right-48 top-0 -z-10 h-[15rem] w-[50rem] rotate-[32deg] rounded-[70rem] bg-[rgb(41,37,124)] opacity-25 blur-[100px] transition-colors duration-75" />
      <Particles
        className="absolute inset-0 -z-10"
        quantity={60}
        ease={40}
        color="#ffffff"
        refresh
      />
      <div>
        <h1 className="text-4xl font-semibold">
          Dive Deep Into Your Music DNA
        </h1>
        <p className="mt-4 text-xl text-muted-foreground">
          Real-time insights into your listening habits, top artists, and music
          journey
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 rounded-2xl text-base font-bold px-5 py-3 bg-[#1ED760] hover:bg-green-600 text-[#121212] transition-colors mt-8"
        >
          <FaSpotify className="size-6" />
          Login with Spotify
        </Link>
      </div>
      <Safari
        url="stats.skylerx.ir"
        className="size-full mt-10"
        videoSrc="https://l767bpghlz.ufs.sh/f/MKOrZK7t4p6TXCHgh3EOqrIDBUh4HVY7dwZbgu0ezlX6onx2"
      />
      <div className="mt-20 flex flex-col items-center">
        <h3 className="text-5xl font-semibold mb-2">
          Not Just Another Stats App
        </h3>
        <p className="text-muted-foreground text-xl mb-10">
          No paywalls for your rights. Your listening stats, done right — clean,
          fast, and honest.
        </p>
        <BentoGridSection />
      </div>
      <TextReveal>
        We don't like to lie to our users with bullshit marketing, fake stats,
        and pointless paywalls. We value your time and your money.
      </TextReveal>
      <WhatSetsUsApart />
      <OpenSource />
    </div>
  );
}
