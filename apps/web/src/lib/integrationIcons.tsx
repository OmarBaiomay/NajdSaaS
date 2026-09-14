import type { ReactNode } from "react";
import {
  SiFacebook,
  SiGoogleads,
  SiGoogleanalytics,
  SiGooglesearchconsole,
  SiHubspot,
  SiInstagram,
  SiMailchimp,
  SiPinterest,
  SiReddit,
  SiShopify,
  SiSnapchat,
  SiTiktok,
  SiX,
  SiYoutube,
} from "react-icons/si";
import { Linkedin, MapPin, Mail, Bot, Layers, Search, Plug } from "lucide-react";

interface IntegrationVisual {
  icon: ReactNode;
  color: string; // tailwind text color class
  bg: string; // tailwind bg tint class
}

const DEFAULT_VISUAL: IntegrationVisual = {
  icon: <Plug size={20} />,
  color: "text-slate-500",
  bg: "bg-slate-100 dark:bg-slate-800",
};

const VISUALS: Record<string, IntegrationVisual> = {
  facebook_ads: { icon: <SiFacebook size={20} />, color: "text-[#1877F2]", bg: "bg-blue-50 dark:bg-blue-950/40" },
  facebook_insights: { icon: <SiFacebook size={20} />, color: "text-[#1877F2]", bg: "bg-blue-50 dark:bg-blue-950/40" },
  instagram_insights: {
    icon: <SiInstagram size={20} />,
    color: "text-[#E4405F]",
    bg: "bg-pink-50 dark:bg-pink-950/40",
  },
  google_ads: { icon: <SiGoogleads size={20} />, color: "text-[#4285F4]", bg: "bg-blue-50 dark:bg-blue-950/40" },
  ga4: { icon: <SiGoogleanalytics size={20} />, color: "text-[#E37400]", bg: "bg-amber-50 dark:bg-amber-950/40" },
  google_search_console: {
    icon: <SiGooglesearchconsole size={20} />,
    color: "text-[#458CF5]",
    bg: "bg-blue-50 dark:bg-blue-950/40",
  },
  google_business_profile: { icon: <MapPin size={20} />, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
  microsoft_ads: { icon: <Search size={20} />, color: "text-[#00A4EF]", bg: "bg-sky-50 dark:bg-sky-950/40" },
  youtube: { icon: <SiYoutube size={20} />, color: "text-[#FF0000]", bg: "bg-red-50 dark:bg-red-950/40" },
  linkedin_ads: { icon: <Linkedin size={20} />, color: "text-[#0A66C2]", bg: "bg-blue-50 dark:bg-blue-950/40" },
  linkedin_pages: { icon: <Linkedin size={20} />, color: "text-[#0A66C2]", bg: "bg-blue-50 dark:bg-blue-950/40" },
  tiktok_ads: { icon: <SiTiktok size={20} />, color: "text-slate-900 dark:text-white", bg: "bg-slate-100 dark:bg-slate-800" },
  tiktok_organic: { icon: <SiTiktok size={20} />, color: "text-slate-900 dark:text-white", bg: "bg-slate-100 dark:bg-slate-800" },
  pinterest_ads: { icon: <SiPinterest size={20} />, color: "text-[#E60023]", bg: "bg-red-50 dark:bg-red-950/40" },
  pinterest_organic: { icon: <SiPinterest size={20} />, color: "text-[#E60023]", bg: "bg-red-50 dark:bg-red-950/40" },
  snapchat_ads: { icon: <SiSnapchat size={20} />, color: "text-[#FFFC00]", bg: "bg-yellow-50 dark:bg-yellow-950/40" },
  reddit_ads: { icon: <SiReddit size={20} />, color: "text-[#FF4500]", bg: "bg-orange-50 dark:bg-orange-950/40" },
  twitter_analytics: { icon: <SiX size={20} />, color: "text-slate-900 dark:text-white", bg: "bg-slate-100 dark:bg-slate-800" },
  twitter_ads: { icon: <SiX size={20} />, color: "text-slate-900 dark:text-white", bg: "bg-slate-100 dark:bg-slate-800" },
  mailchimp: { icon: <SiMailchimp size={20} />, color: "text-[#FFE01B]", bg: "bg-yellow-50 dark:bg-yellow-950/40" },
  cross_platform: { icon: <Layers size={20} />, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/40" },
  hubspot: { icon: <SiHubspot size={20} />, color: "text-[#FF7A59]", bg: "bg-orange-50 dark:bg-orange-950/40" },
  klaviyo: { icon: <Mail size={20} />, color: "text-slate-700 dark:text-slate-200", bg: "bg-slate-100 dark:bg-slate-800" },
  shopify: { icon: <SiShopify size={20} />, color: "text-[#95BF47]", bg: "bg-green-50 dark:bg-green-950/40" },
  chatgpt_ads: { icon: <Bot size={20} />, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
};

export function getIntegrationVisual(integrationId: string): IntegrationVisual {
  return VISUALS[integrationId] ?? DEFAULT_VISUAL;
}
