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
 *    font stack names Plus Jakarta Sans / IBM Plex Sans Arabic so it matches the
 *    builder when the host happens to have them, and degrades to system-ui.
 * 3. Logical properties only (`padding-inline`, `margin-block-start`, `start`/
 *    `end` for text-align). Arabic pages render with dir="rtl" on `.fs-lp`, and
 *    logical properties mirror themselves.
 * 4. Colours are hex, not oklch — published pages are viewed on far more
 *    browsers than the builder is. Values track src/styles.css.
 */

const CARD_SHADOW = "0 1px 2px rgba(11,17,32,.05), 0 8px 24px -12px rgba(11,17,32,.12)";
const BRAND_SHADOW = "0 8px 20px -8px rgba(29,74,255,.55)";

export const PUBLISH_CSS = `
/* ---------- root & reset ---------- */
.fs-lp{
  --fs-brand:#1d4aff;
  --fs-brand-strong:#0f37d6;
  --fs-brand-fg:#ffffff;
  --fs-brand-soft:#eff2ff;
  --fs-surface:#f7f7f9;
  --fs-bg:#ffffff;
  --fs-fg:#0b1120;
  --fs-border:#e3e8ef;
  --fs-muted:#6b7280;
  --fs-danger:#e5484d;
  background:var(--fs-bg);
  color:var(--fs-fg);
  font-family:"Plus Jakarta Sans","IBM Plex Sans Arabic",system-ui,-apple-system,"Segoe UI",Tahoma,Arial,sans-serif;
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
.fs-lp-wrap{width:100%;margin-inline:auto;padding-inline:24px}
.fs-lp-w-narrow{max-width:768px}
.fs-lp-w-default{max-width:1152px}
.fs-lp-w-wide{max-width:1280px}
.fs-lp-w-full{max-width:none}
.fs-lp-grid{display:grid;grid-template-columns:1fr;align-items:start}
.fs-lp-va-center{align-items:center}
.fs-lp-va-end{align-items:end}
@media (min-width:768px){
  .fs-lp-l-50-50{grid-template-columns:1fr 1fr}
  .fs-lp-l-35-65{grid-template-columns:35fr 65fr}
  .fs-lp-l-65-35{grid-template-columns:65fr 35fr}
  .fs-lp-l-3{grid-template-columns:repeat(3,1fr)}
}
.fs-lp .fs-lp-col>*+*{margin-block-start:20px}

/* ---------- text ---------- */
.fs-lp-h1{font-size:36px;line-height:1.1;font-weight:600;letter-spacing:-.02em}
.fs-lp-h2{font-size:30px;line-height:1.2;font-weight:600;letter-spacing:-.02em}
.fs-lp-h3{font-size:20px;line-height:1.3;font-weight:600}
.fs-lp-p{font-size:16px;line-height:1.625;opacity:.8}
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
.fs-lp[dir="rtl"] .fs-lp-cta-arrow{transform:rotate(180deg)}

/* ---------- CTA ---------- */
.fs-lp-cta{
  display:inline-flex;align-items:center;gap:8px;
  border:1px solid transparent;border-radius:16px;
  padding:12px 24px;font-size:14px;font-weight:600;cursor:pointer;
  transition:background-color .15s ease,box-shadow .15s ease;
}
.fs-lp-cta-primary{background:var(--fs-brand);color:var(--fs-brand-fg);box-shadow:${BRAND_SHADOW}}
.fs-lp-cta-primary:hover{background:var(--fs-brand-strong)}
.fs-lp-cta-secondary{background:var(--fs-brand-soft);color:var(--fs-brand);border-color:rgba(29,74,255,.2)}
.fs-lp-cta-secondary:hover{background:#e4e9ff}
.fs-lp-cta-inverse{background:var(--fs-bg);color:var(--fs-brand)}
.fs-lp-cta-inverse:hover{background:#f2f4ff}

/* ---------- CTA banner ---------- */
.fs-lp-ctasec{
  background:var(--fs-brand);color:var(--fs-brand-fg);
  border-radius:24px;padding:48px 32px;text-align:center;box-shadow:${BRAND_SHADOW};
}
.fs-lp-ctasec-t{font-size:30px;line-height:1.2;font-weight:600;letter-spacing:-.02em}
.fs-lp-ctasec-s{margin:8px auto 0;max-width:576px;font-size:14px;line-height:1.6;opacity:.85}
.fs-lp-ctasec .fs-lp-row{margin-block-start:24px}

/* ---------- cards ---------- */
.fs-lp-cards{display:grid;grid-template-columns:1fr;gap:16px}
@media (min-width:768px){
  .fs-lp-cards-2{grid-template-columns:repeat(2,1fr)}
  .fs-lp-cards-3{grid-template-columns:repeat(3,1fr)}
}
.fs-lp-card{
  background:var(--fs-bg);color:var(--fs-fg);
  border:1px solid var(--fs-border);border-radius:20px;
  padding:24px;text-align:start;box-shadow:${CARD_SHADOW};
}
.fs-lp-card-ic{
  display:flex;align-items:center;justify-content:center;
  width:44px;height:44px;border-radius:16px;
  background:var(--fs-brand-soft);color:var(--fs-brand);
}
.fs-lp-card-ic .fs-lp-ic{width:20px;height:20px}
.fs-lp-card-t{margin-block-start:16px;font-size:16px;font-weight:600}
.fs-lp-card-b{margin-block-start:6px;font-size:14px;line-height:1.6;opacity:.7}

/* ---------- icon row ---------- */
.fs-lp-icons{display:flex;flex-wrap:wrap;column-gap:24px;row-gap:12px}
.fs-lp-icons-i{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:500}
.fs-lp-icons-i .fs-lp-ic{color:var(--fs-brand)}

/* ---------- steps ---------- */
.fs-lp-steps{display:grid;grid-template-columns:1fr;gap:16px}
@media (min-width:768px){.fs-lp-steps{grid-template-columns:repeat(3,1fr)}}
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
  background:#0f172a;color:rgba(255,255,255,.8);
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
.fs-lp-in:focus{outline:none;border-color:var(--fs-brand);box-shadow:0 0 0 3px rgba(29,74,255,.15)}
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
.fs-lp-lst-grid{display:grid;grid-template-columns:1fr;gap:16px}
@media (min-width:640px){.fs-lp-lst-grid{grid-template-columns:repeat(2,1fr)}}
@media (min-width:1024px){.fs-lp-lst-grid{grid-template-columns:repeat(4,1fr)}}
.fs-lp-lst-ph{background:var(--fs-bg);border:1px solid var(--fs-border);border-radius:20px;overflow:hidden}
.fs-lp-lst-ph-m{height:112px;background:var(--fs-surface)}
.fs-lp-lst-ph-b{padding:12px;display:flex;flex-direction:column;gap:8px}
.fs-lp-lst-ph-b span{display:block;height:10px;border-radius:999px;background:var(--fs-surface)}
.fs-lp-lst-ph-b span:first-child{width:70%}
.fs-lp-lst-ph-b span:last-child{width:40%}

/* ---------- divider / spacer ---------- */
.fs-lp-hr{margin:0;border:0;border-block-start:1px solid var(--fs-border)}
`.trim();
