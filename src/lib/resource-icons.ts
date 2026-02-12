import {
  Users,
  FileText,
  BarChart3,
  Play,
  Wrench,
  ScrollText,
  MessageSquare,
  CreditCard,
  LayoutList,
  PersonStanding,
  TrendingUp,
  ClipboardList,
  History,
  Zap,
  Bell,
  Image,
  Tag,
  Shield,
  ShoppingCart,
  Mail,
  type LucideIcon,
} from "lucide-react"

/** Pattern-based icon resolver for resource/stat names */
const RESOURCE_ICON_PATTERNS: Array<[RegExp, LucideIcon]> = [
  [/user|account|member|people|profile/i, Users],
  [/content|post|article|story|page|document|blog/i, FileText],
  [/analytic|stat|metric|report|insight/i, BarChart3],
  [/config|setting|preference/i, Wrench],
  [/operation|task|job|queue|cron/i, Play],
  [/feedback|review|comment|rating/i, MessageSquare],
  [/draft|template/i, ScrollText],
  [/credit|payment|billing|invoice|subscription/i, CreditCard],
  [/character|avatar|persona/i, PersonStanding],
  [/usage|log|audit|event/i, ClipboardList],
  [/trend|growth|chart/i, TrendingUp],
  [/history|timeline|version/i, History],
  [/webhook|hook|integration/i, Zap],
  [/notification|alert/i, Bell],
  [/media|image|photo|file|asset|upload/i, Image],
  [/tag|label|category/i, Tag],
  [/role|permission|access|auth/i, Shield],
  [/order|purchase|cart|shop/i, ShoppingCart],
  [/email|message|inbox|mail/i, Mail],
]

/** Get an icon for a resource or stat name using regex patterns */
export function getResourceIcon(name: string): LucideIcon {
  for (const [pattern, icon] of RESOURCE_ICON_PATTERNS) {
    if (pattern.test(name)) return icon
  }
  return LayoutList
}
