/**
 * The published page's stylesheet, as a single string.
 *
 * Rules to keep when editing this file:
 *
 * 1. EVERY selector is scoped under `.fs-lp`. The host site (q84sale.com) already
 *    loads bootstrap-grid, global.scss and utilities.css on every page. An
 *    unscoped rule here would fight with them, and a bare `h1 {}` would restyle
 *    the host's own chrome.
 * 2. No `@import`, no web fonts, no external URLs. The fragment is injected into
 *    someone else's document, so it cannot add requests or `<link>` tags. The
 *    font stack names SS Sakr Soft — 4Sale's brand face, which q84sale.com
 *    already serves — so a published page matches the surrounding site, and
 *    degrades to system-ui anywhere it is missing.
 * 3. Logical properties only (`padding-inline`, `margin-block-start`, `start`/
 *    `end` for text-align). Arabic pages render with dir="rtl" on `.fs-lp`, and
 *    logical properties mirror themselves.
 * 4. Colours are hex, not oklch — published pages are viewed on far more
 *    browsers than the builder is. Values track src/styles.css.
 */

const CARD_SHADOW = "0 1px 2px rgba(2,20,66,.05), 0 8px 24px -12px rgba(2,20,66,.12)";
const BRAND_SHADOW = "0 8px 20px -8px rgba(0,98,255,.55)";
/**
 * 4Sale's elevation scale, from _elevation.scss.
 *
 * A card at rest is el-lvl-1: a 1px neutral_100 ring drawn as a spread
 * shadow, with no drop shadow at all. Hover raises it to el-lvl-4.
 */
const EL_LVL_1 = "0 0 0 1px #e9eaf2";
const EL_LVL_4 = "0 0 0 1px #e9eaf2, 0 6px 20px rgba(9,43,76,.1)";

/**
 * `@font-face` rules for the brand typeface, prepended to the published CSS.
 *
 * Only 400/500/700 ship. They cover everything the builder renders — 600
 * resolves up to 700 — and each file is ~78KB, so shipping all five weights
 * would cost a visitor 150KB of fonts they never see.
 *
 * See FONT_BASE in ./config for why the fragment declares the font at all
 * rather than reusing the host's.
 */
export function fontFaceCss(base: string): string {
  if (!base) return "";
  const root = base.replace(/\/$/, "");
  const face = (file: string, weight: number) =>
    `@font-face{font-family:"SS Sakr Soft";` +
    `src:url("${root}/${file}") format("woff2");` +
    `font-weight:${weight};font-style:normal;font-display:swap}`;
  return (
    face("SSSakrSoft-Regular.woff2", 400) +
    face("SSSakrSoft-Medium.woff2", 500) +
    face("SSSakrSoft-Bold.woff2", 700)
  );
}

export const PUBLISH_CSS = `
/* ---------- root & reset ---------- */
.fs-lp{
  /* The 4Sale design-system tokens, as q84sale.com ships them in production
     (--prim_500, --neutral_600, …). These are the source values that
     src/styles.css converts to oklch — keep the two in step. */
  --fs-brand:#1d4aff;
  --fs-brand-strong:#1a43e8;
  --fs-brand-fg:#ffffff;
  --fs-brand-soft:#f2f5ff;
  --fs-surface:#f5f6f9;
  --fs-bg:#ffffff;
  --fs-fg:#0a1243;
  --fs-border:#dfe1ec;
  --fs-muted:#5c6499;
  --fs-neutral-100:#e9eaf2;
  --fs-neutral-500:#8f95bc;
  --fs-danger:#e63d4e;
  /* The WhatsApp action on a listing card: success_600 ink over success_50.
     Call and Chat pair the same way, prim_600 over prim_4sale_50. */
  --fs-success:#179449;
  --fs-success-soft:#e6f8ee;
  background:var(--fs-bg);
  color:var(--fs-fg);
  font-family:"SS Sakr Soft",system-ui,-apple-system,"Segoe UI",Tahoma,Arial,sans-serif;
  font-size:16px;
  line-height:1.5;
  -webkit-font-smoothing:antialiased;
  text-align:start;
}
/* The reset must land BETWEEN two other sets of rules, so its specificity is
   deliberate — do not "simplify" these selectors:
     - ABOVE the host site's element rules (h1 {}, a {} in their global.scss
       score 0-0-1). A rule targeting an element directly beats anything .fs-lp
       merely passes down by inheritance, so colour and font-family have to be
       reclaimed explicitly here or the host repaints our headings.
     - BELOW our own utility classes further down this file (0-1-0), otherwise
       the reset wipes out every margin they set.
   ".fs-lp :where(...)" scores exactly 0-1-0: :where() adds nothing, so it ties
   with the utilities and loses to them on source order. Written ".fs-lp h1"
   (0-1-1) it breaks the utilities; written ":where(.fs-lp) :where(h1)" (0-0-0)
   it lets the host break us. Both were observed in testing. */
.fs-lp,.fs-lp *,.fs-lp *::before,.fs-lp *::after{box-sizing:border-box}
/* Neutralizer. The host may style any bare element globally (their global.scss
   sets rules like "img { border: ... }"). Everything we emit is restyled by the
   fs-lp-* classes below, so zeroing these costs us nothing and stops host
   element rules bleeding through. Form controls are excluded so native
   checkbox/select rendering survives. :where() keeps this at 0-1-0.
   NOTE: no backticks anywhere in this file's CSS — it is a template literal. */
.fs-lp :where(:not(input,select,textarea,button,option)){
  background-color:transparent;border-width:0;padding:0;margin:0;box-shadow:none;
  float:none;letter-spacing:normal;text-transform:none;text-indent:0;
}
.fs-lp :where(h1,h2,h3,p,figure,fieldset){margin:0;color:inherit;font-family:inherit}
.fs-lp :where(ul,ol){margin:0;padding:0;list-style:none}
.fs-lp :where(img){display:block;max-width:100%}
.fs-lp :where(a){color:inherit;text-decoration:none}
.fs-lp :where(button){background:transparent;border:0;padding:0;cursor:pointer}
.fs-lp :where(button,input,select,textarea){font:inherit;color:inherit;letter-spacing:inherit}

/* ---------- container / section ---------- */
.fs-lp-sec{width:100%}
.fs-lp-bg-white{background:var(--fs-bg)}
.fs-lp-bg-soft{background:var(--fs-brand-soft)}
.fs-lp-bg-gray{background:var(--fs-surface)}
.fs-lp-bg-brand{background:var(--fs-brand);color:var(--fs-brand-fg)}
/* Image backgrounds are inlined per section; these only provide the stacking
   context so the scrim sits over the image and under the copy. */
.fs-lp-bg-custom{position:relative;overflow:hidden;background-repeat:no-repeat}
.fs-lp-scrim{position:absolute;inset:0;pointer-events:none}
.fs-lp-bg-custom > .fs-lp-wrap{position:relative}
.fs-lp-wrap{width:100%;margin-inline:auto;padding-inline:24px}
.fs-lp-w-narrow{max-width:768px}
.fs-lp-w-default{max-width:1152px}
.fs-lp-w-wide{max-width:1280px}
.fs-lp-w-full{max-width:none}
.fs-lp-grid{display:grid;grid-template-columns:1fr;align-items:start;--fs-tracks:1fr}
.fs-lp-va-center{align-items:center}
.fs-lp-va-end{align-items:end}
@media (min-width:768px){
  .fs-lp-grid:not(.fs-lp-dir-v){grid-template-columns:var(--fs-tracks)}
}
.fs-lp-dir-v{grid-template-columns:1fr;grid-template-rows:var(--fs-tracks)}
.fs-lp-dir-v.fs-lp-split{min-height:24rem}
/* Every column is a container, so a block inside one sizes its own grid from
   the space it actually has rather than from the viewport. */
.fs-lp-col{container:fs-lp-col / inline-size}
.fs-lp .fs-lp-col>*+*{margin-block-start:20px}

/* ---------- text ---------- */
.fs-lp-h1{font-size:36px;line-height:1.1;font-weight:600;letter-spacing:-.02em}
.fs-lp-h2{font-size:30px;line-height:1.2;font-weight:600;letter-spacing:-.02em}
.fs-lp-h3{font-size:20px;line-height:1.3;font-weight:600}
.fs-lp-p{font-size:16px;line-height:1.625;opacity:.8}
.fs-lp-fw-regular{font-weight:400}
.fs-lp-fw-bold{font-weight:700}
@media (min-width:768px){.fs-lp-h1{font-size:48px}}
.fs-lp-ta-start{text-align:start}
.fs-lp-ta-center{text-align:center}
.fs-lp-ta-end{text-align:end}
.fs-lp-row{display:flex}
.fs-lp-ja-start{justify-content:flex-start}
.fs-lp-ja-center{justify-content:center}
.fs-lp-ja-end{justify-content:flex-end}

/* ---------- icons ---------- */
.fs-lp-ic{width:16px;height:16px;flex:none}
/* Horizontal icons mirror in Arabic: an arrow means "forward", and forward is
   leftward in an RTL page. scaleX rather than rotate so an icon that is not
   vertically symmetric still flips correctly. */
.fs-lp[dir="rtl"] .fs-lp-ic-dir{transform:scaleX(-1)}

/* ---------- CTA ---------- */
.fs-lp-cta{
  display:inline-flex;align-items:center;gap:8px;
  border:1px solid transparent;
  padding:12px 24px;font-size:14px;font-weight:600;cursor:pointer;
  transition:background-color .15s ease,box-shadow .15s ease;
}
.fs-lp-cta-primary{background:var(--fs-brand);color:var(--fs-brand-fg);box-shadow:${BRAND_SHADOW}}
.fs-lp-cta-primary:hover{background:var(--fs-brand-strong)}
.fs-lp-cta-secondary{background:var(--fs-brand-soft);color:var(--fs-brand);border-color:rgba(0,98,255,.2)}
.fs-lp-cta-secondary:hover{background:#e0e6ff}
.fs-lp-cta-inverse{background:var(--fs-bg);color:var(--fs-brand)}
.fs-lp-cta-inverse:hover{background:#f2f5ff}

/* ---------- CTA banner ---------- */
.fs-lp-ctasec{
  background:var(--fs-brand);color:var(--fs-brand-fg);
  border-radius:24px;padding:48px 32px;text-align:center;box-shadow:${BRAND_SHADOW};
}
.fs-lp-ctasec-t{font-size:30px;line-height:1.2;font-weight:600;letter-spacing:-.02em}
.fs-lp-ctasec-s{margin:8px auto 0;max-width:576px;font-size:14px;line-height:1.6;opacity:.85}
.fs-lp-ctasec .fs-lp-row{margin-block-start:24px}

/* ---------- cards ---------- */
/* Columns follow the block, not the viewport — the same reason the listings
   grid does. A cards block sitting in a 35/65 column would otherwise still ask
   for three columns on a wide screen and get ~120px cards. */
.fs-lp-cards{display:grid;grid-template-columns:minmax(0,1fr);gap:16px}
@container fs-lp-col (min-width:768px){
  .fs-lp-cards-2{grid-template-columns:repeat(2,minmax(0,1fr))}
  .fs-lp-cards-3{grid-template-columns:repeat(3,minmax(0,1fr))}
}
.fs-lp-card{
  background:var(--fs-bg);color:var(--fs-fg);
  border:1px solid var(--fs-border);border-radius:20px;
  padding:24px;text-align:start;box-shadow:${CARD_SHADOW};
}
/* Colours are inlined per block — the chip's tone is an editor's choice, not a
   design-system constant — so only the geometry lives here. */
.fs-lp-card-ic{
  display:flex;align-items:center;justify-content:center;
  width:44px;height:44px;border-radius:16px;
}
.fs-lp-card-ic .fs-lp-ic{width:20px;height:20px}
.fs-lp-card-t{margin-block-start:16px;font-size:16px;font-weight:600}
.fs-lp-card-b{margin-block-start:6px;font-size:14px;line-height:1.6;opacity:.7}

/* ---------- icon row ---------- */
.fs-lp-icons{display:flex;flex-wrap:wrap;column-gap:24px;row-gap:12px}
.fs-lp-icons-i{display:flex;align-items:center;gap:8px;font-weight:500}
/* List stacks one pair per line — the shape a feature tick-list needs. The
   icon's own size is inlined per block, because it is a value an editor drags
   and so cannot live in a shared stylesheet. */
.fs-lp-icons-list{flex-direction:column;flex-wrap:nowrap;row-gap:12px}
.fs-lp-icons-i .fs-lp-ic{flex:none}
/* The chip behind an icon. Fully rounded so it stays a circle at any size;
   its dimensions and colours are inlined per block, since both are choices an
   editor makes rather than fixed design-system values. */
.fs-lp-icons-c{display:inline-flex;flex:none;align-items:center;justify-content:center;border-radius:999px}
.fs-lp-icons-i .fs-lp-ic{color:var(--fs-brand)}

/* ---------- steps ---------- */
.fs-lp-steps{display:grid;grid-template-columns:minmax(0,1fr);gap:16px}
@container fs-lp-col (min-width:768px){.fs-lp-steps{grid-template-columns:repeat(3,minmax(0,1fr))}}
.fs-lp-step{background:var(--fs-surface);color:var(--fs-fg);border-radius:20px;padding:24px}
.fs-lp-step-n{
  display:flex;align-items:center;justify-content:center;
  width:36px;height:36px;border-radius:999px;
  background:var(--fs-brand);color:var(--fs-brand-fg);
  font-size:14px;font-weight:700;
}
.fs-lp-step-t{margin-block-start:16px;font-size:16px;font-weight:600}
.fs-lp-step-b{margin-block-start:4px;font-size:14px;line-height:1.6;opacity:.7}

/* ---------- FAQ ---------- */
.fs-lp-faq{background:var(--fs-bg);color:var(--fs-fg);border:1px solid var(--fs-border);border-radius:20px;overflow:hidden}
.fs-lp-faq-i{padding:16px}
.fs-lp-faq-i+.fs-lp-faq-i{border-block-start:1px solid var(--fs-border)}
.fs-lp-faq-q{cursor:pointer;list-style:none;font-size:14px;font-weight:600}
.fs-lp-faq-q::-webkit-details-marker{display:none}
.fs-lp-faq-a{margin-block-start:8px;font-size:14px;line-height:1.6;opacity:.7}

/* ---------- image / video ---------- */
.fs-lp-img{width:100%;border-radius:20px;object-fit:cover;box-shadow:${CARD_SHADOW}}
.fs-lp-imgph{
  display:flex;align-items:center;justify-content:center;gap:8px;
  width:100%;border:1px dashed var(--fs-border);border-radius:20px;
  background:var(--fs-surface);color:var(--fs-muted);font-size:14px;
}
.fs-lp-video{
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;
  width:100%;aspect-ratio:16/9;border-radius:20px;
  background:var(--fs-fg);color:rgba(255,255,255,.8);
}
.fs-lp-video .fs-lp-ic{width:48px;height:48px}
.fs-lp-video-c{font-size:13px}

/* ---------- form ---------- */
.fs-lp-form{
  background:var(--fs-bg);color:var(--fs-fg);
  border:1px solid var(--fs-border);border-radius:20px;
  padding:24px;box-shadow:${CARD_SHADOW};
}
.fs-lp-form-t{font-size:18px;font-weight:600;margin-block-end:16px}
.fs-lp-f+.fs-lp-f{margin-block-start:12px}
.fs-lp-lb{display:block;font-size:12px;font-weight:500;color:var(--fs-muted);margin-block-end:6px}
.fs-lp-req{color:var(--fs-danger)}
.fs-lp-in{
  width:100%;border:1px solid var(--fs-border);border-radius:16px;
  background:var(--fs-bg);padding:10px 16px;font-size:14px;
}
.fs-lp-in:focus{outline:none;border-color:var(--fs-brand);box-shadow:0 0 0 3px rgba(0,98,255,.15)}
.fs-lp-ck{display:flex;align-items:center;gap:8px;font-size:14px}
.fs-lp-ck input{width:16px;height:16px;accent-color:var(--fs-brand)}
.fs-lp-submit{
  width:100%;margin-block-start:16px;border:0;border-radius:16px;
  background:var(--fs-brand);color:var(--fs-brand-fg);
  padding:12px 24px;font-size:14px;font-weight:600;cursor:pointer;
  box-shadow:${BRAND_SHADOW};transition:background-color .15s ease;
}
.fs-lp-submit:hover{background:var(--fs-brand-strong)}
.fs-lp-ok{
  margin-block-start:16px;border-radius:16px;
  background:var(--fs-brand-soft);color:var(--fs-brand);
  padding:16px;font-size:14px;
}

/* ---------- marketplace listings (host-hydrated) ---------- */
.fs-lp-lst-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;margin-block-end:12px}
.fs-lp-chips{display:flex;flex-wrap:wrap;gap:6px}
.fs-lp-chip{border-radius:999px;background:var(--fs-brand-soft);color:var(--fs-brand);padding:4px 10px;font-size:11px;font-weight:500}
/* Grid and card geometry copied from q84sale.com's own listing grid so an
   embedded block lines up with the rails above and below it: four columns,
   stepping down at the Bootstrap breakpoints the host already uses, and a gap
   that tightens from 24px to 12px on phones. */
/* Columns follow the block's own width, not the viewport's.
   A viewport rule is only correct when the block is full width. Put a listings
   block in a 35/65 split, or in a section set to narrow, and a 1400px window
   still asked for four columns inside 400px of space. The block is the thing
   that decides how many cards fit, so the block is what gets measured — and at
   full width the two are the same number, so a normal page still breaks exactly
   where q84sale.com does.
   A minmax(0,1fr) minimum because a track's default minimum is auto: a nowrap button
   row or tag would otherwise push its column past its share. */
.fs-lp-lst{container:fs-lp-lst / inline-size}
.fs-lp-lst-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:12px}
@container fs-lp-lst (min-width:768px){.fs-lp-lst-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}}
@container fs-lp-lst (min-width:992px){.fs-lp-lst-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@container fs-lp-lst (min-width:1200px){.fs-lp-lst-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}

/* Card geometry, type scale and colours are the real component's, taken from
   StackedCard.module.scss, _typo.scss, _elevation.scss and _colors.css rather
   than measured off a screenshot. Two that are easy to get wrong:
     - the resting outline is el-lvl-1, a 1px neutral_100 ring drawn as a
       spread shadow with NO drop shadow. A real border would be a shade too
       heavy, since the nearest border token is neutral_200.
     - the contact buttons are flex 1 1 auto, so they size to their labels and
       then share the slack. flex:1 (basis 0) forces equal widths, which the
       real row never does. */
.fs-lp-lst-card{container:fs-lp-card / inline-size;position:relative;min-width:0;display:flex;flex-direction:column;justify-content:space-between;height:100%;background:var(--fs-bg);border-radius:16px;box-shadow:${EL_LVL_1};transition:all .3s ease-in-out}
.fs-lp-lst-card:hover{box-shadow:${EL_LVL_4}}
@media (prefers-reduced-motion:reduce){.fs-lp-lst-card,.fs-lp-lst-track{transition:none;scroll-behavior:auto}}
.fs-lp-lst-media{position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden;background:var(--fs-neutral-100);aspect-ratio:16/9;border-start-start-radius:16px;border-start-end-radius:16px}
.fs-lp-lst-media img{width:100%;height:100%;object-fit:cover}
/* The carousel, without arrows. A published page has no script to advance
   slides, so they sit in a scroll-snapping track: swiping and trackpad
   scrolling still page through the photos. The arrows are omitted rather than
   drawn dead — the real app reveals them on hover and hides them outright on
   touch, so this reads as its mobile treatment. A hidden scrollbar-width and the
   webkit rule hide the bar without disabling the scrolling itself. */
.fs-lp-lst-track{display:flex;width:100%;height:100%;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;-ms-overflow-style:none}
.fs-lp-lst-track::-webkit-scrollbar{display:none}
.fs-lp-lst-slide{position:relative;flex:0 0 100%;width:100%;height:100%;scroll-snap-align:center}
/* Last frame: a grey placeholder with the image icon and "See more", not a
   dimmed copy of the previous photo. */
.fs-lp-lst-more{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:var(--fs-neutral-500);color:var(--fs-brand-fg);font-size:12px;line-height:16px;font-weight:500;text-align:center;text-decoration:none}
.fs-lp-lst-more-ic{width:32px;height:32px;color:rgba(10,18,67,.45)}
/* Tag rail: 12px in from the top-start corner, 4px between pills. */
.fs-lp-lst-tags{position:absolute;top:12px;inset-inline-start:12px;z-index:9;display:flex;gap:4px}
/* Featured is the gold crown plus the word. Pinned is the red thumbtack in a
   20px white circle — not the verified check. */
.fs-lp-lst-tag{display:flex;align-items:center;height:20px;padding:2px 8px;border-radius:999px;white-space:nowrap;font-size:12px;line-height:16px;font-weight:500;background:var(--fs-bg);color:var(--fs-fg)}
.fs-lp-lst-tag svg{width:16px;height:16px;flex:none}
.fs-lp-lst-tag svg+span{margin-inline-start:4px}
.fs-lp-lst-tag-pin{width:20px;padding:2px;justify-content:center}
/* Carousel bullets: 6px, 2px apart, 4px off the bottom, active is prim_500. */
.fs-lp-lst-dots{position:absolute;bottom:4px;left:50%;transform:translateX(-50%);z-index:5;display:flex}
.fs-lp-lst-dots i{display:block;width:6px;height:6px;margin:0 2px;border-radius:100px;background:var(--fs-bg)}
.fs-lp-lst-dots i.on{background:var(--fs-brand)}
/* Overlay density on a short photo. Tags and dots are sized for a full-width
   search card (~280px). Below the threshold they step down; below the second
   they drop the dots. */
@container fs-lp-card (max-width:239px){
  .fs-lp-lst-tag{height:18px;padding:1px 6px;font-size:11px}
  .fs-lp-lst-tag svg{width:14px;height:14px}
  .fs-lp-lst-tag-pin{width:18px;padding:1px}
  .fs-lp-lst-dots{max-width:60%;overflow:hidden}
}
@container fs-lp-card (max-width:179px){
  .fs-lp-lst-dots{display:none}
}
.fs-lp-lst-body{display:flex;flex-direction:column;gap:6px;padding:12px;border-end-start-radius:16px;border-end-end-radius:16px}
.fs-lp-lst-tr{display:flex;justify-content:space-between}
.fs-lp-lst-tw{flex:1;min-width:0;overflow:hidden}
/* Title is .h6 — bold 16/24 — truncated to one line, and the only link on the
   card. See serialize.ts for why the card itself is not an anchor. */
.fs-lp-lst-t{display:block;font-size:16px;line-height:24px;font-weight:700;color:var(--fs-fg);text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
a.fs-lp-lst-t:hover{color:var(--fs-brand)}
/* Favourite: IconButton shape — circle, filled neutral_50, medium. Opens the
   listing, because a landing page cannot favourite in-app. */
.fs-lp-lst-fav{display:inline-flex;flex-shrink:0;align-items:center;justify-content:center;width:40px;height:40px;margin-inline-start:8px;border-radius:999px;background:var(--fs-surface);color:var(--fs-fg)}
.fs-lp-lst-fav svg{width:20px;height:20px}
/* Specification line: .text-5-med — medium 14/20, neutral_600, one line. */
.fs-lp-lst-sub{height:20px;font-size:14px;line-height:20px;font-weight:500;color:var(--fs-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fs-lp-lst-row{display:flex;justify-content:space-between;align-items:center;gap:4px}
/* Price is .h6 in prim_500, in a fixed 24px row. */
.fs-lp-lst-price{height:24px;min-width:0;font-size:16px;line-height:24px;font-weight:700;color:var(--fs-brand);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* Age is .text-6-med — medium 12/16, neutral_600. */
.fs-lp-lst-since{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;line-height:16px;font-weight:500;color:var(--fs-muted)}
/* Contact row: small toned buttons, 8px/12px padding on a 12/16 label. Call
   and Chat take prim_600 ink, WhatsApp success_600 — the 600 step in both
   cases, not the 500 the price uses. */
.fs-lp-lst-acts{display:flex;min-width:0;gap:4px;margin:6px 0}
.fs-lp-lst-act{display:inline-flex;flex:1 1 auto;min-width:0;overflow:hidden;align-items:center;justify-content:center;gap:4px;padding:8px 12px;border-radius:999px;font-size:12px;line-height:16px;font-weight:700;text-decoration:none;white-space:nowrap}
.fs-lp-lst-act svg{width:16px;height:16px;flex:none}
/* Labels drop under EITHER condition, because they are two different failures.
   The window rule is 4Sale's own isLgOrLess and is what makes a full-width grid
   behave like theirs. The card rule is the floor it misses: a 160px card on a
   1400px screen passes the window test and still cannot seat three labelled
   buttons. Two independent hide rules rather than one combined condition, so
   neither depends on source order. */
@media (max-width:1199px){.fs-lp-lst-lbl{display:none}}
@container fs-lp-card (max-width:259px){.fs-lp-lst-lbl{display:none}}
.fs-lp-lst-act-call,.fs-lp-lst-act-chat{background:var(--fs-brand-soft);color:var(--fs-brand-strong)}
.fs-lp-lst-act-wa{background:var(--fs-success-soft);color:var(--fs-success)}
.fs-lp-lst-cta{display:flex;justify-content:center;margin-block-start:24px}

/* Call / WhatsApp window. :target because published HTML cannot run script.
   Opening is href="#id"; closing (X or the dimmed scrim) is href="#!". */
.fs-lp-contact{display:none;position:fixed;inset:0;z-index:200;align-items:center;justify-content:center;padding:16px}
.fs-lp-contact:target{display:flex}
.fs-lp-contact-scrim{position:absolute;inset:0;background:rgba(10,18,67,.45)}
.fs-lp-contact-box{position:relative;z-index:1;width:100%;max-width:420px;padding:20px 24px 24px;border-radius:16px;background:var(--fs-bg);box-shadow:${EL_LVL_4}}
.fs-lp-contact-h{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-block-end:16px}
.fs-lp-contact-t{font-size:18px;line-height:24px;font-weight:700;color:var(--fs-fg)}
.fs-lp-contact-x{display:inline-flex;width:32px;height:32px;flex:none;align-items:center;justify-content:center;border-radius:999px;color:var(--fs-neutral-500)}
.fs-lp-contact-x svg{width:20px;height:20px}
.fs-lp-contact-row{display:flex;align-items:center;gap:12px;font-size:16px;line-height:24px;font-weight:500;color:var(--fs-fg);text-decoration:none}
.fs-lp-contact-ic{display:inline-flex;width:40px;height:40px;flex:none;align-items:center;justify-content:center;border-radius:999px}
.fs-lp-contact-ic svg{width:20px;height:20px}
.fs-lp-contact-ic-call{background:var(--fs-brand-soft);color:var(--fs-brand)}
.fs-lp-contact-ic-wa{background:var(--fs-success);color:#fff}

/* Unconfigured state: the same silhouette, so the block does not resize once
   real listings arrive. */
.fs-lp-lst-ph .fs-lp-lst-media{background:var(--fs-neutral-100)}
.fs-lp-lst-ph-b{display:flex;flex-direction:column;gap:6px;padding:12px}
.fs-lp-lst-ph-b span{display:block;height:20px;border-radius:4px;background:var(--fs-neutral-100)}
.fs-lp-lst-ph-b span:first-child{width:70%}
.fs-lp-lst-ph-b span:last-child{width:40%}
/* Reserves the contact row's height so the block does not jump when the real
   cards arrive. */
.fs-lp-lst-ph-b::after{content:"";display:block;height:32px;margin:6px 0;border-radius:999px;background:var(--fs-surface)}

/* ---------- divider / spacer ---------- */
.fs-lp-hr{margin:0;border:0;border-block-start:1px solid var(--fs-border)}
`.trim();
