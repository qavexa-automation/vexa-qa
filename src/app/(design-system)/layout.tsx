import { Barlow_Condensed, DM_Sans } from "next/font/google";

import { NavigationProgress } from "@/components/app-shell/navigation-progress";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "@/styles/design-system.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-barlow-condensed",
});

// A separate root layout keeps Tailwind away from the workspace's unlayered stylesheets, which
// would otherwise override utility classes. Crossing between the two is a full page load.
export default function DesignSystemLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html className={`${dmSans.variable} ${barlowCondensed.variable}`} lang="en" suppressHydrationWarning>
      <head>
        <script id="vexa-theme-init" dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>
          <TooltipProvider>
            <NavigationProgress />
            {children}
            <Toaster richColors />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
