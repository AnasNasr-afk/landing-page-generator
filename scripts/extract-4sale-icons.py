#!/usr/bin/env python3
"""Regenerates src/lib/fs-icons.ts from 4Sale's icon fonts.

The builder draws 4Sale's own icons rather than a generic set, and a published
landing page has to carry them without loading a webfont — the fragment cannot
add external requests, and the stroke font alone is 382KB for glyphs we use a
couple of dozen of. So the outlines are extracted once, here, into path data.

Usage:

    git clone --depth 1 -b staging \\
        git@bitbucket.org:technivance/fe-web-4sale-re-scaffolding.git /tmp/rescaffolding
    python3 -m venv /tmp/fontenv && /tmp/fontenv/bin/pip install fonttools
    /tmp/fontenv/bin/python scripts/extract-4sale-icons.py /tmp/rescaffolding

To add an icon: find its glyph in the web app (the components call
`<IconFont name="..." />`), add a line to ICONS below, and re-run. Names on the
left are what the builder asks for; the string on the right is the glyph.
"""

import re
import sys
from pathlib import Path

from fontTools.misc.transform import Transform
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

# builder name -> (font, glyph class name from the icon font's style.css)
ICONS: dict[str, tuple[str, str]] = {
    # listing card
    "phone": ("stroke", "phone_phone-default_Stroke"),
    "chat": ("stroke", "chat_chat-default_Stroke"),
    "heart": ("stroke", "heart_heart_Stroke"),
    "verified": ("solid", "verification-check_Solid"),
    "chevronStart": ("stroke", "chevron-big_chevron-big-left_Stroke"),
    "chevronEnd": ("stroke", "chevron-big_chevron-big-right_Stroke"),
    # navigation / arrows
    "arrowRight": ("stroke", "arrow_arrow-right_Stroke"),
    "arrowLeft": ("stroke", "arrow_arrow-left_Stroke"),
    "arrowDown": ("stroke", "arrow_arrow-down_Stroke"),
    "arrowUp": ("stroke", "arrow_arrow-up_Stroke"),
    "chevronDown": ("stroke", "chevron_chevron-down_Stroke"),
    "externalLink": ("stroke", "external-link_external-link-square_Stroke"),
    # editor chrome
    "alignStart": ("stroke", "align_align-left_Stroke"),
    "alignCenter": ("stroke", "align_align-horizontal-center_Stroke"),
    "alignEnd": ("stroke", "align_align-right_Stroke"),
    "check": ("stroke", "check-tick_check-tick-single_Stroke"),
    "close": ("stroke", "multiple-cross_multiple-cross-cancel-default_Stroke"),
    "code": ("stroke", "code_Stroke"),
    "copy": ("stroke", "copy_copy-default_Stroke"),
    "download": ("stroke", "download_download-down_Stroke"),
    "drag": ("stroke", "dragable-six-dots_Stroke"),
    "trash": ("stroke", "delete_delete-dustbin-01_Stroke"),
    "plus": ("stroke", "plus_plus-default_Stroke"),
    "minus": ("stroke", "minus_minus-default_Stroke"),
    "search": ("stroke", "search_search-default_Stroke"),
    "spinner": ("stroke", "spinner_Stroke"),
    "translate": ("stroke", "translate_Stroke"),
    "upload": ("stroke", "cloud_cloud-arrow-upload_Stroke"),
    "warning": ("stroke", "alert_alert-triangle_Stroke"),
    "question": ("stroke", "question_question-mark-circle_Stroke"),
    "plugin": ("stroke", "plugin_plugin-addon-default_Stroke"),
    "pointer": ("stroke", "pointer-cursor_pointer-cursor-default_Stroke"),
    "click": ("stroke", "pointer-cursor_pointer-cursor-click_Stroke"),
    # symbols the web app actually puts on buttons (see CTA_SYMBOLS)
    "rocket": ("stroke", "rocket-ship_Stroke"),
    "info": ("stroke", "information_information-circle_Stroke"),
    "location": ("stroke", "map_map-pin_Stroke"),
    "cash": ("stroke", "cash_Stroke"),
    "calendarCheck": ("stroke", "calendar_calendar-check_Stroke"),
    "edit": ("stroke", "pencil-edit_pencil-edit_Stroke"),
    "flag": ("stroke", "flag_Stroke"),

    # page content
    "image": ("stroke", "photo-image_photo-image-default_Stroke"),
    "imagePlus": ("stroke", "photo-image_photo-image-plus_Stroke"),
    "playCircle": ("stroke", "play_play-circle_Stroke"),
    "video": ("stroke", "video-recording_Stroke"),
    "heading": ("stroke", "heading_heading-h1_Stroke"),
    "text": ("stroke", "font_font-aa_Stroke"),
    "grid": ("stroke", "grid_grid-01_Stroke"),
    "list": ("stroke", "list_list-default_Stroke"),
    "clipboard": ("stroke", "clipboard_clipboard-default_Stroke"),
    "megaphone": ("stroke", "megaphone-announcement-shout_Stroke"),
    "store": ("stroke", "building_store_Stroke"),
    "spacer": ("stroke", "swap_swap-arrow-vertical_Stroke"),
    "phoneDevice": ("stroke", "iphone_Stroke"),
    "shieldCheck": ("stroke", "shield_shield-check_Stroke"),
    "badgeCheck": ("stroke", "check_check-tick-circle_Stroke"),
    "sparkle": ("stroke", "sparkle_sparkle-ai-01_Stroke"),
    "users": ("stroke", "user_user-three_Stroke"),
    "bolt": ("stroke", "lightning_lightning-thunder-electric-on_Stroke"),
    "barChart": ("stroke", "bar-chart_barchart-default_Stroke"),
    "layout": ("stroke", "layout-grid_layout-grid-stack-up_Stroke"),
    "layoutSplit": ("stroke", "layout-grid_layout-grid-two-vertical_Stroke"),
    "trendUp": ("stroke", "graph-chart_graph-trend-line-upward_Stroke"),
}

# `featured` is already an SVG component in the web app rather than a glyph, and
# it is the only multi-colour icon here — the gold crown keeps its own fills.
FEATURED_PATHS = [
    ("M14.3375 6.83125L12.7277 12.2969L11.0261 13.2594H6.71203L3.27453 12.2969C3.27453 12.2969 2.0084 7.97418 1.72474 7.02036L1.66465 6.83125C1.6303 6.71096 1.64742 6.58205 1.71612 6.47038L2.72164 6.05781L5.24247 7.03748L7.15895 3.77185H8.84323L10.7597 7.03748L13.2805 6.05781L14.3375 6.83125Z", "#FFD400"),
    ("M14.3379 6.83125L12.728 12.2969L11.0265 13.2594H8.00146V3.77185H8.84361L10.7601 7.03748L13.2809 6.05781L14.3379 6.83125Z", "#FDBF00"),
    ("M3.2749 12.2969V13.5859C3.2749 13.8265 3.4639 14.0156 3.70459 14.0156H12.2983C12.539 14.0156 12.728 13.8265 12.728 13.5859V12.2969H3.2749Z", "#FDBF00"),
    ("M8.00147 1.98438C7.28812 1.98438 6.7124 2.56009 6.7124 3.27344C6.7124 4.00391 7.31396 4.5625 8.00147 4.5625C8.71481 4.5625 9.29053 3.97817 9.29053 3.27344C9.29053 2.56009 8.71481 1.98438 8.00147 1.98438Z", "#FDBF00"),
    ("M14.0439 7.14063C13.6806 7.14063 13.3637 6.99919 13.1301 6.76543C12.882 6.50404 12.7549 6.19106 12.7549 5.85156C12.7549 5.14079 13.3332 4.5625 14.0439 4.5625C14.7547 4.5625 15.333 5.14079 15.333 5.85156C15.333 6.56234 14.7547 7.14063 14.0439 7.14063Z", "#FF9F00"),
    ("M1.95557 7.14063C1.24479 7.14063 0.666504 6.56234 0.666504 5.85156C0.666504 5.14079 1.24479 4.5625 1.95557 4.5625C2.66634 4.5625 3.24463 5.14079 3.24463 5.85156C3.24463 6.57062 2.66578 7.14063 1.95557 7.14063Z", "#FDBF00"),
    ("M8.00146 4.5625V1.98438C8.71481 1.98438 9.29053 2.56009 9.29053 3.27344C9.29053 3.97817 8.71481 4.5625 8.00146 4.5625Z", "#FF9F00"),
    ("M12.728 12.2969V13.5859C12.728 13.8265 12.539 14.0156 12.2983 14.0156H8.00146V12.2969H12.728Z", "#FF9F00"),
    ("M10.1317 8.4469C10.0801 8.28364 9.94269 8.17197 9.77943 8.14623L8.81689 8.00871L8.3872 7.15784C8.30988 7.02043 8.15513 6.94299 8.00048 6.94299C7.84584 6.94299 7.69109 7.02043 7.61376 7.15784L7.18408 8.00871L6.22153 8.14623C6.05827 8.17197 5.92086 8.28364 5.86928 8.4469C5.82631 8.60166 5.86928 8.77353 5.98957 8.88521L6.67707 9.54697L6.51381 10.4752C6.48796 10.6298 6.54816 10.7931 6.68568 10.8962C6.81459 10.9908 6.99508 10.9993 7.13249 10.9306L8.00048 10.4837L8.86847 10.9306C9.0145 11.0079 9.18638 10.9907 9.31539 10.8962C9.4528 10.7931 9.51301 10.6298 9.48716 10.4751L9.3239 9.54697L10.0114 8.88521C10.1317 8.77353 10.1748 8.60166 10.1317 8.4469Z", "#FF9F00"),
    ("M8.86946 10.9306L8.00146 10.4837V6.94299C8.15611 6.94299 8.31086 7.02043 8.38818 7.15784L8.81787 8.00871L9.78042 8.14623C9.94368 8.17197 10.0811 8.28364 10.1327 8.4469C10.1756 8.60166 10.1327 8.77353 10.0124 8.88521L9.32488 9.54697L9.48814 10.4752C9.51399 10.6298 9.45379 10.7931 9.31626 10.8962C9.18736 10.9907 9.01548 11.0079 8.86946 10.9306Z", "#FF7816"),
]

WHATSAPP = "M16.6 14C16.4 13.9 15.1 13.3 14.9 13.2C14.7 13.1 14.5 13.1 14.3 13.3C14.1 13.5 13.7 14.1 13.5 14.3C13.4 14.5 13.2 14.5 13 14.4C12.3 14.1 11.6 13.7 11 13.2C10.5 12.7 10 12.1 9.6 11.5C9.5 11.3 9.6 11.1 9.7 11C9.8 10.9 9.9 10.7 10.1 10.6C10.2 10.5 10.3 10.3 10.3 10.2C10.4 10.1 10.4 9.90001 10.3 9.80001C10.2 9.70001 9.7 8.50001 9.5 8.00001C9.4 7.30001 9.2 7.30001 9 7.30001C8.9 7.30001 8.7 7.30001 8.5 7.30001C8.3 7.30001 8 7.50001 7.9 7.60001C7.3 8.20001 7 8.90001 7 9.70001C7.1 10.6 7.4 11.5 8 12.3C9.1 13.9 10.5 15.2 12.2 16C12.7 16.2 13.1 16.4 13.6 16.5C14.1 16.7 14.6 16.7 15.2 16.6C15.9 16.5 16.5 16 16.9 15.4C17.1 15 17.1 14.6 17 14.2C17 14.2 16.8 14.1 16.6 14ZM19.1 4.90001C15.2 1.00001 8.9 1.00001 5 4.90001C1.8 8.10001 1.2 13 3.4 16.9L2 22L7.3 20.6C8.8 21.4 10.4 21.8 12 21.8C17.5 21.8 21.9 17.4 21.9 11.9C22 9.30001 20.9 6.80001 19.1 4.90001ZM16.4 18.9C15.1 19.7 13.6 20.2 12 20.2C10.5 20.2 9.1 19.8 7.8 19.1L7.5 18.9L4.4 19.7L5.2 16.7L5 16.4C2.6 12.4 3.8 7.40001 7.7 4.90001C11.6 2.40001 16.6 3.70001 19 7.50001C21.4 11.4 20.3 16.5 16.4 18.9Z"

HEADER = '''/**
 * 4Sale's own icons, vendored from the `fe-web-4sale-re-scaffolding` web app.
 *
 * GENERATED by scripts/extract-4sale-icons.py — do not edit by hand. To add an
 * icon, add it to that script's ICONS map and re-run.
 *
 * The builder draws these instead of a generic icon set so pages built here look
 * like 4Sale, and they are path data rather than the icon webfont so a published
 * page pays for a few dozen icons rather than 382KB of glyphs it never renders.
 * The outlines come from `4Sale-icons-stroke.ttf` and `-solid-v12.ttf`, scaled
 * from the fonts' 1024 em square onto a 24x24 viewBox.
 *
 * `whatsapp` and `featured` were already SVG components in that repo
 * (`design-system/Icons/WhatsApp.tsx`, `.../Featured.tsx`) and are copied
 * verbatim. Everything else paints with `currentColor`, so CSS decides; the gold
 * `featured` crown is the one exception and keeps its own fills.
 */

/** Path data plus the viewBox it was drawn in. */
export type FsIcon = { viewBox: string; paths: { d: string; fill?: string }[] };

export const FS_ICONS = {
'''


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    repo = Path(sys.argv[1])
    base = repo / "public/assets/icon-font"
    fonts = {
        "stroke": (base / "fonts-stroke/4Sale-icons-stroke.ttf",
                   base / "4Sale-icons-stroke-v1.0/style.css"),
        "solid": (base / "fonts-solid/4Sale-icons-solid-v12.ttf",
                  base / "4Sale-icons-solid-v12-v1.0/style.css"),
    }

    loaded = {}
    for kind, (ttf, css) in fonts.items():
        text = css.read_text()
        codes = {
            m.group(1): int(m.group(2), 16)
            for m in re.finditer(r"\.icon-([A-Za-z0-9_-]+):before\s*\{\s*content:\s*'\\([0-9a-fA-F]+)'", text)
        }
        font = TTFont(ttf)
        loaded[kind] = (font, font.getGlyphSet(), font.getBestCmap(),
                        font["head"].unitsPerEm, codes)

    out = [HEADER]
    missing = []
    for name, (kind, glyph) in ICONS.items():
        font, gs, cmap, upem, codes = loaded[kind]
        cp = codes.get(glyph)
        if cp is None or cmap.get(cp) is None:
            missing.append((name, glyph))
            continue
        pen = SVGPathPen(gs)
        scale = 24.0 / upem
        gs[cmap[cp]].draw(TransformPen(pen, Transform(scale, 0, 0, -scale, 0, 24.0)))
        out.append(
            f'  /** {glyph} */\n  {name}: {{\n    viewBox: "0 0 24 24",\n'
            f'    paths: [{{ d: "{pen.getCommands()}" }}],\n  }},\n'
        )

    out.append(
        '  /** design-system/Icons/WhatsApp.tsx */\n  whatsapp: {\n'
        '    viewBox: "0 0 24 24",\n'
        f'    paths: [{{ d: "{WHATSAPP}" }}],\n  }},\n'
    )
    out.append('  /** design-system/Icons/Featured.tsx — keeps its own colours. */\n  featured: {\n    viewBox: "0 0 16 16",\n    paths: [\n')
    for d, fill in FEATURED_PATHS:
        out.append(f'      {{ d: "{d}", fill: "{fill}" }},\n')
    out.append("    ],\n  },\n")
    out.append("} as const satisfies Record<string, FsIcon>;\n\nexport type FsIconName = keyof typeof FS_ICONS;\n")

    if missing:
        print("MISSING glyphs:", missing, file=sys.stderr)
        return 1

    dest = Path(__file__).resolve().parent.parent / "src/lib/fs-icons.ts"
    dest.write_text("".join(out), newline="\r\n")
    print(f"wrote {dest} with {len(ICONS) + 2} icons")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
