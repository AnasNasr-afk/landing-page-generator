# 4Sale Page Studio

Build a high-fidelity interactive prototype for a 4Sale Generic Landing Page Builder / Customizer.

This is not a blog CMS and should not look or behave like a blog editor.

Product Context

Today, when the 4Sale Marketing/SEO team wants to create a new landing page, the flow is roughly:

Marketing requirement → Designer creates the landing page design → Developer implements it → Developer publishes it.

The goal is to replace this repeated dependency with a self-service no-code landing page builder where an authorized 4Sale user can create, customize, preview, save as a reusable template, and publish landing pages without requiring a designer or developer every time.

Use this existing 4Sale landing page as a visual/use-case reference only, not as a fixed template:

https://www.q84sale.com/ar/business-profile-request

The builder itself must remain generic enough to create many different landing page types, such as:

Business/lead-generation pages

Marketing campaign pages

Promotional pages

Service pages

SEO landing pages

Marketplace/category landing pages

Pages containing forms or CTAs

Brand Identity

The UI and generated landing-page preview should clearly feel like 4Sale.

Use:

Clean white backgrounds

4Sale royal/electric blue as the primary brand color, approximately #1D4AFF

Light blue secondary surfaces

Minimal neutral grays

Clean modern typography

Rounded but not overly playful components

Spacious layout

Professional marketplace/product feel

Avoid generic SaaS purple gradients or overly colorful UI.

The landing page output should visually feel like it belongs on q84sale.com.

Main Builder UX

Use a desktop builder interface inspired conceptually by tools such as Draw.io, Webflow, Canva, or page builders, but do not create unrestricted pixel-by-pixel positioning.

The experience should be flexible while remaining structured and responsive.

Use four main areas:

1. Compact Navigation Rail

Include:

Build

Templates

SEO

Assets

2. Left Panel — Elements Library

Show reusable elements grouped into categories.

Layout

Container

Columns

Spacer

Content

Heading

Paragraph/Text

Image

Video placeholder

Cards

Icons

Conversion

CTA Button

CTA Section/Banner

Form

Marketplace Listings

Informational

FAQ

Steps / How It Works

Divider

Elements should be easy to add into containers.

Container System

Users build the landing page using responsive containers.

When adding a container, allow layouts such as:

1 column

2 columns — 50/50

2 columns — 35/65

2 columns — 65/35

3 columns

The user should be able to:

Add containers

Select containers

Reorder containers

Duplicate containers

Delete containers

Change the layout later

Container design controls should include:

Background color

Padding

Spacing

Border radius

Content width

Alignment

Keep the system structured enough to automatically remain responsive on mobile.

Do NOT create absolute X/Y positioning like Figma.

Elements

Each column can contain multiple elements.

The user should be able to select an element and edit it from a right-side properties panel.

Heading

Properties:

Content

H1 / H2 / H3

Alignment

Text

Properties:

Content

Alignment

Image

Properties:

Upload placeholder

Alt text

Height / sizing

Alignment

Cards

Allow use cases such as:

Benefits

Features

Value propositions

The prototype can use a simple repeatable card structure.

Steps

Support numbered step sections such as:

Submit request

Get reviewed

Go live

Form

Forms are important because some landing pages exist specifically for lead generation.

Show conceptually configurable fields such as:

Text

Phone

Email

Dropdown

Checkbox

Allow:

Required / optional

Submit button label

Success message

Optional redirect after submit

The prototype does not need a real backend.

Marketplace Listings

Include a custom 4Sale Listings component conceptually capable of displaying dynamic marketplace inventory.

Configuration examples:

Category

Make

Model

Area

Number of listings displayed

Use mocked data in the prototype and label this clearly as an API-dependent integration.

CTA System

CTAs are a core part of the builder.

Do not treat CTA as only a visual button.

Each CTA should have:

Button label

Action type

Destination

Tracking event name

Action types should include:

Internal 4Sale URL

External URL

Scroll to a section/form

App deep link

Category/search-result deep link

Examples:

"Request a Business Profile"
→ scroll to form

"View Cars"
→ internal filtered 4Sale results page

"Download the App"
→ app deep link

Also support full-width CTA sections/banners.

Templates

Templates must NOT be limited to predefined system templates.

A user should be able to build any landing page structure and choose:

Save as Template

Ask for:

Template name

Description

Save:

Containers

Column layouts

Element types

Design settings

Structure

Then when creating a new landing page, offer:

Start from Blank Canvas

Start from Saved Template

After selecting a template, the user can freely modify the new page without changing the original template.

Include a Templates Library screen.

Example Landing Page

Preload the builder with a Business Profile lead-generation page inspired by the current 4Sale Business Profile landing page.

This is only an EXAMPLE of what can be created.

Suggested structure:

Container 1:
2 columns

Left:

H1: "Grow your business on 4Sale"

Supporting copy

Primary CTA

Right:

Large visual/image

Container 2:

H2: Why create a Business Profile?

Three benefit cards

Container 3:

Image + supporting content

Container 4:

"How it works"

Three steps

Container 5:

Lead-generation form

Container 6:

Strong blue CTA section

The page preview should look like a real 4Sale landing page, not an editor mockup.

Page-Level Settings

Keep page-level settings separate from element/container design.

Include:

Internal page name

URL slug

Language

Draft / Published state

Preview

Publish

The SEO/Marketing user is allowed to publish without engineering approval.

Arabic & English

The CMS should conceptually treat Arabic and English as versions of the same landing-page entity.

The exact public URL architecture is still pending SEO validation.

Do NOT hardcode ?lang=ar / ?lang=en as the final SEO solution.

Allow an AR/EN switch in the prototype and support RTL layout for Arabic.

Clearly mark language URL behavior, hreflang and canonical behavior as requiring SEO validation.

SEO & AI Search Panel

Create a dedicated SEO & AI Search tab at page level.

The Marketing/SEO user should see business-friendly controls, while technical SEO should ideally be platform-managed.

Editable fields can include:

SEO title

Meta description

URL slug

Target search query/topic

Index / Noindex

Optional canonical override

Image alt text where relevant

Show a Google Search Result preview.

Also include an AI / Answer Engine section with a field like:

"Direct factual answer"

This can represent concise page content designed to answer the page's target query clearly.

However, label AI/AEO behavior as pending validation with the SEO specialist rather than claiming guaranteed ranking or LLM citation.

Technical SEO — Clearly Mark as Pending Validation

Show these as platform-level considerations, not normal design settings:

Arabic / English URL structure

hreflang

canonical behavior

sitemap inclusion

structured data/schema

crawlability

indexability

rendering strategy

Core Web Vitals/performance

Google Search Console integration

structured content for search engines and AI search

Use a small validation/status area showing that these rules need to be finalized with the SEO specialist and Engineering.

Do not invent final rules.

Preview & Publish

Provide:

Save Draft

Preview

Publish

Preview should show only the final 4Sale landing page without builder outlines.

Publish can simply change the prototype state from Draft to Published.

Overall UX Goal

The product should feel like:

"A lightweight custom 4Sale Webflow/Page Builder"

rather than:

WordPress

Notion

Blog editor

Figma

Full professional design software

The Marketing/SEO user should have enough flexibility to produce different branded landing pages without needing a designer every time, while the system still protects:

Brand consistency

Responsive behavior

SEO foundations

Tracking

Maintainability

Build this as an interactive front-end prototype using mocked data only. Prioritize the builder experience, flexibility, reusable templates, CTAs, forms, SEO panel, and realistic 4Sale landing-page preview over backend functionality.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1e267c5b-2065-4197-8344-0025afc070d6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
