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
      <div
        className="pointer-events-none absolute top-0 right-0 -z-10 h-[15rem] w-[30rem] md:w-[50rem] rounded-[70rem] bg-[rgb(125,41,134)] opacity-25 blur-[100px] transition-colors duration-75 hidden md:block"
        style={{ transform: "translateX(25%) rotate(32deg)" }}
      />
      <div
        className="pointer-events-none absolute top-0 right-0 -z-10 h-[15rem] w-[30rem] md:w-[50rem] rounded-[70rem] bg-[rgb(41,37,124)] opacity-25 blur-[100px] transition-colors duration-75 hidden md:block"
        style={{ transform: "translateX(-25%) rotate(32deg)" }}
      />

      <Particles
        className="absolute inset-0 -z-10"
        quantity={60}
        ease={40}
        color="#ffffff"
        refresh
      />
      <div className="px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl md:text-4xl font-semibold">
          Dive Deep Into Your Music DNA
        </h1>
        <p className="mt-4 text-lg md:text-xl text-muted-foreground">
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

      <div className="w-full mt-10 overflow-hidden">
        <Safari
          url="stats.skylerx.ir"
          className="w-full max-w-full"
          videoSrc="https://l767bpghlz.ufs.sh/f/MKOrZK7t4p6TXCHgh3EOqrIDBUh4HVY7dwZbgu0ezlX6onx2"
        />
      </div>

      <div className="mt-20 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
        <h3 className="text-4xl md:text-5xl font-semibold mb-2 text-center">
          Not Just Another Stats App
        </h3>
        <p className="text-muted-foreground text-lg md:text-xl mb-10 text-center">
          No paywalls for your rights. Your listening stats, done right — clean,
          fast, and honest.
        </p>
        <BentoGridSection />
      </div>
      <div className="px-4 sm:px-6 lg:px-8">
        <TextReveal>
          We don't like to lie to our users with bullshit marketing, fake stats,
          and pointless paywalls. We value your time and your money.
        </TextReveal>
        <WhatSetsUsApart />
        <OpenSource />
      </div>
    </div>
  );
}
