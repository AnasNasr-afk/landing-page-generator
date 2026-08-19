import heroBusiness from "@/assets/hero-business.jpg";
import featureApp from "@/assets/feature-app.jpg";
import {
  type Container,
  type ElementType,
  type LandingPage,
  type PageElement,
  type Template,
  uid,
} from "./builder-types";

const L = (en: string, ar: string) => ({ en, ar });

export const ELEMENT_LIBRARY: {
  group: string;
  items: { type: ElementType; label: string; icon: string; hint: string }[];
}[] = [
  {
    group: "Layout",
    items: [
      { type: "spacer", label: "Spacer", icon: "MoveVertical", hint: "Vertical space" },
      { type: "divider", label: "Divider", icon: "Minus", hint: "Thin rule" },
    ],
  },
  {
    group: "Content",
    items: [
      { type: "heading", label: "Heading", icon: "Heading", hint: "H1 / H2 / H3" },
      { type: "text", label: "Paragraph", icon: "Type", hint: "Body copy" },
      { type: "image", label: "Image", icon: "Image", hint: "Upload or URL" },
      { type: "video", label: "Video", icon: "Video", hint: "Embed placeholder" },
      { type: "cards", label: "Cards", icon: "LayoutGrid", hint: "Benefits / features" },
      { type: "icons", label: "Icons", icon: "Sparkles", hint: "Icon row" },
    ],
  },
  {
    group: "Conversion",
    items: [
      { type: "cta", label: "CTA Button", icon: "MousePointerClick", hint: "Tracked action" },
      { type: "ctaSection", label: "CTA Section", icon: "Megaphone", hint: "Full-width banner" },
      { type: "form", label: "Form", icon: "ClipboardList", hint: "Lead generation" },
      { type: "listings", label: "4Sale Listings", icon: "Store", hint: "API-dependent" },
    ],
  },
  {
    group: "Informational",
    items: [
      { type: "faq", label: "FAQ", icon: "MessagesSquare", hint: "Q & A list" },
      { type: "steps", label: "Steps", icon: "ListOrdered", hint: "How it works" },
    ],
  },
];

export function defaultProps(type: ElementType): Record<string, unknown> {
  switch (type) {
    case "heading":
      return { text: L("New heading", "عنوان جديد"), level: "h2", align: "start" };
    case "text":
      return {
        text: L(
          "Add supporting copy that explains the value of this section.",
          "أضف نصاً يوضح قيمة هذا القسم.",
        ),
        align: "start",
      };
    case "image":
      return { src: "", alt: L("Describe the image", "وصف الصورة"), height: 320, align: "center" };
    case "video":
      return { label: L("Video placeholder", "مكان الفيديو"), ratio: "16/9" };
    case "cards":
      return {
        columns: 3,
        items: [1, 2, 3].map((n) => ({
          icon: "BadgeCheck",
          title: L(`Benefit ${n}`, `الميزة ${n}`),
          body: L("Short description of this benefit.", "وصف مختصر لهذه الميزة."),
        })),
      };
    case "icons":
      return {
        items: [
          { icon: "ShieldCheck", label: L("Verified", "موثّق") },
          { icon: "Zap", label: L("Fast", "سريع") },
          { icon: "Users", label: L("Trusted", "موثوق") },
        ],
      };
    case "cta":
      return {
        label: L("Get started", "ابدأ الآن"),
        action: "scroll",
        destination: "#lead-form",
        event: "cta_click",
        variant: "primary",
        align: "start",
      };
    case "ctaSection":
      return {
        title: L("Ready to grow on 4Sale?", "جاهز للنمو على 4Sale؟"),
        subtitle: L("Thousands of buyers are searching every day.", "آلاف المشترين يبحثون يومياً."),
        cta: {
          label: L("Request a Business Profile", "اطلب ملف تجاري"),
          action: "scroll",
          destination: "#lead-form",
          event: "cta_banner_click",
          variant: "inverse",
        },
      };
    case "form":
      return {
        title: L("Request a Business Profile", "اطلب ملفاً تجارياً"),
        anchor: "lead-form",
        submitLabel: L("Submit request", "إرسال الطلب"),
        success: L("Thanks! Our team will contact you shortly.", "شكراً! سيتواصل فريقنا معك قريباً."),
        redirect: "",
        fields: [
          { id: uid(), label: L("Full name", "الاسم الكامل"), type: "text", required: true },
          { id: uid(), label: L("Phone number", "رقم الهاتف"), type: "phone", required: true },
          { id: uid(), label: L("Business email", "البريد الإلكتروني"), type: "email", required: false },
          {
            id: uid(),
            label: L("Business category", "فئة النشاط"),
            type: "dropdown",
            required: true,
            options: "Cars, Real Estate, Electronics, Services",
          },
          {
            id: uid(),
            label: L("I agree to be contacted", "أوافق على التواصل معي"),
            type: "checkbox",
            required: true,
          },
        ],
      };
    case "listings":
      // `categoryPath` is the selected branch of the 4Sale category tree, root
      // first; `filters` are the facets applied within it, keyed by field id;
      // `items` is whatever the editor last previewed and applied. All start
      // empty so a freshly dropped block shows placeholders until someone picks
      // a category — see `src/lib/listings-api.ts`.
      return {
        title: L("Featured listings", "إعلانات مميزة"),
        categoryPath: [],
        filters: {},
        items: [],
        count: 4,
      };
    case "faq":
      return {
        items: [
          {
            q: L("Who can request a Business Profile?", "من يمكنه طلب ملف تجاري؟"),
            a: L("Any licensed business selling on 4Sale.", "أي نشاط تجاري مرخّص يبيع على 4Sale."),
          },
          {
            q: L("How long does review take?", "كم تستغرق المراجعة؟"),
            a: L("Usually 1–2 business days.", "عادة من يوم إلى يومين عمل."),
          },
        ],
      };
    case "steps":
      return {
        items: [
          { title: L("Submit request", "أرسل الطلب"), body: L("Fill the short form.", "املأ النموذج القصير.") },
          { title: L("Get reviewed", "تتم المراجعة"), body: L("Our team verifies your business.", "يقوم فريقنا بالتحقق.") },
          { title: L("Go live", "انطلق"), body: L("Your profile is published.", "يتم نشر ملفك التجاري.") },
        ],
      };
    case "spacer":
      return { height: 40 };
    default:
      return {};
  }
}

export const newElement = (type: ElementType): PageElement => ({
  id: uid(),
  type,
  props: defaultProps(type),
});

export const newContainer = (layout: Container["layout"], cols: number): Container => ({
  id: uid(),
  name: "Container",
  layout,
  background: "white",
  paddingY: 64,
  gap: 32,
  radius: 0,
  contentWidth: "default",
  align: "start",
  columns: Array.from({ length: cols }, () => []),
});

const el = (type: ElementType, props: Record<string, unknown>): PageElement => ({
  id: uid(),
  type,
  props: { ...defaultProps(type), ...props },
});

export const businessProfileContainers = (): Container[] => [
  {
    ...newContainer("50-50", 2),
    name: "Hero",
    background: "soft",
    paddingY: 80,
    align: "start",
    columns: [
      [
        el("heading", {
          text: L("Grow your business on 4Sale", "طوّر تجارتك على فورسيل"),
          level: "h1",
        }),
        el("text", {
          text: L(
            "Create a verified Business Profile and reach millions of buyers across Kuwait — with your listings, contact details and brand in one trusted place.",
            "أنشئ ملفاً تجارياً موثقاً وتواصل مع ملايين المشترين في الكويت — إعلاناتك وبيانات التواصل وعلامتك في مكان واحد موثوق.",
          ),
        }),
        el("cta", {
          label: L("Request a Business Profile", "اطلب ملفاً تجارياً"),
          action: "scroll",
          destination: "#lead-form",
          event: "hero_cta_business_profile",
        }),
      ],
      [el("image", { src: "__hero__", alt: L("Business owner using 4Sale", "صاحب عمل يستخدم فورسيل"), height: 400 })],
    ],
  },
  {
    ...newContainer("1", 1),
    name: "Benefits",
    align: "center",
    columns: [
      [
        el("heading", {
          text: L("Why create a Business Profile?", "لماذا تنشئ ملفاً تجارياً؟"),
          level: "h2",
          align: "center",
        }),
        el("cards", {
          items: [
            {
              icon: "BadgeCheck",
              title: L("Verified trust badge", "شارة توثيق"),
              body: L("Buyers see a verified badge on every listing you post.", "يرى المشترون شارة التوثيق على كل إعلان."),
            },
            {
              icon: "TrendingUp",
              title: L("More visibility", "ظهور أكبر"),
              body: L("Priority placement in category and search results.", "أولوية الظهور في نتائج البحث والفئات."),
            },
            {
              icon: "BarChart3",
              title: L("Performance insights", "تحليلات الأداء"),
              body: L("Track views, calls and chats from one dashboard.", "تابع المشاهدات والاتصالات من لوحة واحدة."),
            },
          ],
        }),
      ],
    ],
  },
  {
    ...newContainer("65-35", 2),
    name: "Storefront",
    columns: [
      [
        el("heading", { text: L("Your storefront, always open", "متجرك مفتوح دائماً"), level: "h2" }),
        el("text", {
          text: L(
            "Every Business Profile includes a branded page with your logo, description, working hours and all active listings — shareable anywhere.",
            "كل ملف تجاري يتضمن صفحة تحمل شعارك ووصفك وساعات العمل وجميع إعلاناتك النشطة — قابلة للمشاركة في أي مكان.",
          ),
        }),
        el("icons", {
          items: [
            { icon: "ShieldCheck", label: L("Verified business", "نشاط موثق") },
            { icon: "Phone", label: L("Direct contact", "تواصل مباشر") },
            { icon: "Store", label: L("Branded page", "صفحة بعلامتك") },
          ],
        }),
      ],
      [el("image", { src: "__app__", alt: L("4Sale business profile on mobile", "الملف التجاري على الجوال"), height: 300 })],
    ],
  },
  {
    ...newContainer("1", 1),
    name: "Listings",
    background: "gray",
    columns: [
      [
        el("heading", { text: L("Live inventory on your page", "مخزونك مباشرة على صفحتك"), level: "h2", align: "center" }),
        // Seeded with a branch already selected and two facets applied, so the
        // demo page opens the cascade three levels deep with the filter rail
        // already narrowed. `items` stays empty — the block is meant to show
        // its unpreviewed state until someone runs the picker.
        el("listings", {
          categoryPath: [
            { id: "cars", name: L("Cars", "سيارات") },
            { id: "cars-toyota", name: L("Toyota", "تويوتا") },
            { id: "cars-toyota-landcruiser", name: L("Land Cruiser", "لاند كروزر") },
          ],
          filters: { year: ["2025", "2024"], transmission: ["automatic"] },
          filterSummary: [L("2025", "2025"), L("2024", "2024"), L("Automatic", "أوتوماتيك")],
        }),
      ],
    ],
  },
  {
    ...newContainer("1", 1),
    name: "How it works",
    columns: [
      [
        el("heading", { text: L("How it works", "كيف تعمل"), level: "h2", align: "center" }),
        el("steps", {}),
      ],
    ],
  },
  {
    ...newContainer("35-65", 2),
    name: "Lead form",
    background: "soft",
    columns: [
      [
        el("heading", { text: L("Talk to our business team", "تحدث مع فريق الأعمال"), level: "h2" }),
        el("text", {
          text: L(
            "Send your details and a 4Sale specialist will walk you through pricing and setup.",
            "أرسل بياناتك وسيتواصل معك مختص من فورسيل لشرح الأسعار والتفعيل.",
          ),
        }),
        el("faq", {}),
      ],
      [el("form", {})],
    ],
  },
  {
    ...newContainer("1", 1),
    name: "Closing CTA",
    paddingY: 24,
    columns: [[el("ctaSection", {})]],
  },
];

export const seedPage = (): LandingPage => ({
  id: uid(),
  name: "Business Profile Request",
  slug: "business-profile-request",
  status: "draft",
  languages: ["en", "ar"],
  seo: {
    title: L("Business Profile on 4Sale — Grow Your Business", "الملف التجاري على فورسيل — طوّر تجارتك"),
    description: L(
      "Request a verified 4Sale Business Profile to reach millions of buyers in Kuwait with priority visibility and performance insights.",
      "اطلب ملفاً تجارياً موثقاً على فورسيل للوصول إلى ملايين المشترين في الكويت.",
    ),
    slug: "business-profile-request",
    targetQuery: L("business profile 4sale kuwait", "ملف تجاري فورسيل الكويت"),
    index: true,
    canonical: "",
    aiAnswer: L(
      "A 4Sale Business Profile is a verified storefront for licensed businesses in Kuwait. It adds a trust badge, priority placement in search, and performance analytics. Businesses request one by submitting the form on this page; review takes 1–2 business days.",
      "الملف التجاري على فورسيل هو متجر موثق للأنشطة المرخصة في الكويت، يمنح شارة توثيق وأولوية في الظهور وتحليلات للأداء.",
    ),
  },
  containers: businessProfileContainers(),
});

export const seedTemplates = (): Template[] => [
  {
    id: uid(),
    name: "Business Lead Generation",
    description: "Hero, benefits, how it works, lead form and closing CTA. Built from the Business Profile page.",
    category: "Lead generation",
    containers: businessProfileContainers(),
    kind: "page",
    system: true,
  },
  {
    id: uid(),
    name: "Campaign Promo",
    description: "Short promotional page: bold hero, three value cards and a full-width CTA banner.",
    category: "Campaign",
    kind: "page",
    system: true,
    containers: [
      {
        ...newContainer("1", 1),
        name: "Promo hero",
        background: "brand",
        paddingY: 96,
        align: "center",
        columns: [
          [
            el("heading", { text: L("Summer deals are live", "عروض الصيف الآن"), level: "h1", align: "center" }),
            el("text", { text: L("Limited-time offers across every category.", "عروض لفترة محدودة في كل الفئات."), align: "center" }),
            el("cta", {
              label: L("Browse offers", "تصفح العروض"),
              action: "search",
              destination: "/ar/search?promo=summer",
              event: "promo_browse",
              variant: "inverse",
              align: "center",
            }),
          ],
        ],
      },
      { ...newContainer("1", 1), name: "Value", align: "center", columns: [[el("cards", {})]] },
      { ...newContainer("1", 1), name: "CTA", paddingY: 24, columns: [[el("ctaSection", {})]] },
    ],
  },
  {
    id: uid(),
    name: "Category SEO Page",
    description: "SEO landing structure: intro copy, live listings block, FAQ and app deep-link CTA.",
    category: "SEO",
    kind: "page",
    system: true,
    containers: [
      {
        ...newContainer("1", 1),
        name: "Intro",
        columns: [
          [
            el("heading", { text: L("Used cars for sale in Kuwait", "سيارات مستعملة للبيع في الكويت"), level: "h1" }),
            el("text", {}),
          ],
        ],
      },
      { ...newContainer("1", 1), name: "Listings", background: "gray", columns: [[el("listings", {})]] },
      { ...newContainer("1", 1), name: "FAQ", columns: [[el("heading", { text: L("Common questions", "أسئلة شائعة"), level: "h2" }), el("faq", {})]] },
      {
        ...newContainer("1", 1),
        name: "App CTA",
        paddingY: 24,
        columns: [
          [
            el("ctaSection", {
              title: L("Search faster in the app", "ابحث أسرع في التطبيق"),
              cta: {
                label: L("Download the App", "حمّل التطبيق"),
                action: "app",
                destination: "q84sale://home",
                event: "app_download_cta",
                variant: "inverse",
              },
            }),
          ],
        ],
      },
    ],
  },
];

export const MOCK_LISTINGS = [
  { title: "Toyota Land Cruiser GXR 2022", price: "12,500 KD", area: "Kuwait City", tag: "Verified" },
  { title: "Toyota Land Cruiser VXR 2021", price: "14,200 KD", area: "Hawally", tag: "Featured" },
  { title: "Toyota Land Cruiser 2020", price: "10,900 KD", area: "Salmiya", tag: "Verified" },
  { title: "Toyota Land Cruiser 2019", price: "9,750 KD", area: "Jahra", tag: "Verified" },
  { title: "Toyota Land Cruiser 2023", price: "16,400 KD", area: "Farwaniya", tag: "New" },
  { title: "Toyota Land Cruiser 2018", price: "8,300 KD", area: "Ahmadi", tag: "Verified" },
];

export const IMAGE_MAP: Record<string, string> = {
  __hero__: heroBusiness,
  __app__: featureApp,
};
