import { getUrl } from "@/lib/utils";
import { BentoCard, BentoGrid } from "@workspace/ui/components/bento-grid";
import { Globe } from "@workspace/ui/components/globe";

import {
  BellIcon,
  Code2Icon,
  Cpu,
  GaugeIcon,
  LockIcon,
  Shield,
} from "lucide-react";

const features = [
  {
    Icon: Code2Icon,
    name: "Global API",
    description: "We provide a globally accessible API for your data.",
    cta: "Learn More",
    href: getUrl("developer"),
    background: (
      <div className="opacity-60">
        <Globe />
      </div>
    ),
    className: "lg:col-start-1 lg:col-end-2 lg:row-start-1 lg:row-end-3",
  },
  {
    Icon: GaugeIcon,
    name: "High Performance",
    description: "Fast and efficient data processing.",
    className: "lg:col-start-1 lg:col-end-2 lg:row-start-3 lg:row-end-4",
  },
  {
    Icon: Cpu,
    name: "Advanced Algorithm",
    description:
      "Our processors use advanced algorithms to analyze your data and provide the most impactful/accurate results.",
    background: (
      <img
        className="absolute -right-16 -top-10 rounded-md opacity-60"
        src="https://l767bpghlz.ufs.sh/f/MKOrZK7t4p6TGB769QTZat1yliHdoYMSIk8vBhnCPqgzeUsm"
        alt="Advanced Algorithm Code Snippet"
      />
    ),
    className: "lg:row-start-1 lg:row-end-4 lg:col-start-2 lg:col-end-3",
  },
  {
    Icon: Shield,
    name: "Secure by Default",
    description: "Best security practices to protect you and your account data",
    className: "lg:col-start-3 lg:col-end-3 lg:row-start-1 lg:row-end-2",
  },
  {
    Icon: LockIcon,
    name: "You Own It",
    description:
      "We don’t sell your data. Export, delete, or take it with you anytime.",
    href: "/privacy",
    cta: "Learn More",
    className: "lg:col-start-3 lg:col-end-3 lg:row-start-2 lg:row-end-4",
  },
];

export default function BentoGridSection() {
  return (
    <BentoGrid className="lg:grid-rows-3">
      {features.map((feature) => (
        <BentoCard key={feature.name} {...feature} />
      ))}
    </BentoGrid>
  );
}
