import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { ChartNoAxesColumn } from "lucide-react";

export const baseOptions: BaseLayoutProps = {
  nav: {
    title: (
      <>
        <ChartNoAxesColumn className="size-5" />
        MyStats
      </>
    ),
    url: "https://stats.skylerx.ir",
  },
  links: [],
};
