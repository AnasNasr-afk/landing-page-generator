import { FS_ICONS, type FsIconName } from "./fs-icons";

/**
 * Resolves an icon name written in page data to one of 4Sale's icons.
 *
 * Icon names live inside serialisable element props (`{ icon: "badgeCheck" }`),
 * which means two things at once: pages saved before the builder switched off
 * Lucide still carry Lucide's names, and an editor can type anything into the
 * icon field. Both have to land on a real glyph rather than a blank square.
 *
 * `ICON_ALIAS` covers every Lucide name the builder ever shipped in seed data or
 * defaults, so old pages keep drawing what they drew — just in 4Sale's set. The
 * fallback is deliberately a visible, meaningful glyph rather than an empty box:
 * a page that renders a slightly wrong icon is recoverable, one that renders
 * nothing looks broken.
 */
const ICON_ALIAS: Record<string, FsIconName> = {
  // Lucide names that appear in seeded content and element defaults.
  AlertTriangle: "warning",
  TriangleAlert: "warning",
  AlignLeft: "alignStart",
  AlignCenter: "alignCenter",
  AlignRight: "alignEnd",
  ArrowDown: "arrowDown",
  ArrowUp: "arrowUp",
  ArrowLeft: "arrowLeft",
  ArrowRight: "arrowRight",
  BadgeCheck: "badgeCheck",
  BarChart3: "barChart",
  Check: "check",
  ChevronDown: "chevronDown",
  ChevronLeft: "chevronStart",
  ChevronRight: "chevronEnd",
  ClipboardList: "clipboard",
  Code2: "code",
  Copy: "copy",
  Download: "download",
  ExternalLink: "externalLink",
  GripVertical: "drag",
  Heading: "heading",
  Image: "image",
  ImagePlus: "imagePlus",
  Languages: "translate",
  LayoutGrid: "grid",
  ListOrdered: "list",
  Loader: "spinner",
  Megaphone: "megaphone",
  MessagesSquare: "chat",
  Minus: "minus",
  MousePointerClick: "click",
  MousePointerSquareDashed: "pointer",
  MoveVertical: "spacer",
  Phone: "phone",
  Pin: "pin",
  PlayCircle: "playCircle",
  Plug: "plugin",
  Plus: "plus",
  Search: "search",
  ShieldCheck: "shieldCheck",
  ShieldQuestion: "question",
  Smartphone: "phoneDevice",
  Sparkles: "sparkle",
  Store: "store",
  Trash2: "trash",
  TrendingUp: "trendUp",
  Type: "text",
  UploadCloud: "upload",
  Users: "users",
  X: "close",
  Video: "video",
  Zap: "bolt",
};

/** Drawn when a name matches nothing — see the note above on why not blank. */
const FALLBACK: FsIconName = "badgeCheck";

export function resolveIconName(name: string): FsIconName {
  if (name in FS_ICONS) return name as FsIconName;
  return ICON_ALIAS[name] ?? FALLBACK;
}

/** Every icon an editor can pick, for the properties panel's picker. */
export const ICON_CHOICES = Object.keys(FS_ICONS) as FsIconName[];

/**
 * Icons that point somewhere, and so must mirror in Arabic.
 *
 * An arrow means "forward", not "rightward". In an RTL page forward *is*
 * leftward, so an unmirrored arrow on an Arabic button points back the way the
 * reader came. The names describe how each looks in English — `arrowRight` is
 * the forward one — and the mirror flips them for AR.
 *
 * Only horizontal icons are listed. `arrowDown` and `arrowUp` mean the same
 * thing in both directions and must not be touched, which is the reason this is
 * an explicit set rather than "anything with arrow in the name".
 */
const DIRECTIONAL = new Set<string>([
  "arrowRight",
  "arrowLeft",
  "chevronStart",
  "chevronEnd",
  "externalLink",
]);

export const isDirectionalIcon = (name: string): boolean => DIRECTIONAL.has(resolveIconName(name));
