import type { HubResourceType } from "../types/studio";

export const RESOURCE_SEED_VERSION = "designer-resource-list-v1";

export type HubResourceSeed = {
  title: string;
  url?: string;
  type: HubResourceType;
  collection: string;
  tags: string;
  notes: string;
  favorite?: boolean;
};

const seed = (
  title: string,
  url: string | undefined,
  type: HubResourceType,
  collection: string,
  tags: string,
  notes: string,
): HubResourceSeed => ({ title, url, type, collection, tags, notes });

export const resourceSeeds: HubResourceSeed[] = [
  seed("Awwwards", "https://www.awwwards.com/", "inspiration", "UI Inspiration & Galleries", "awards, web design, inspiration", "Award-winning websites for high-end visual and interaction inspiration."),
  seed("Land Book", "https://land-book.com/", "inspiration", "UI Inspiration & Galleries", "landing pages, inspiration", "Curated landing pages and product websites."),
  seed("One Page Love", "https://onepagelove.com/", "inspiration", "UI Inspiration & Galleries", "one page, landing pages", "Single-page websites, landing pages, and launch pages."),
  seed("Lapa Ninja", "https://www.lapa.ninja/", "inspiration", "UI Inspiration & Galleries", "landing pages, startup", "Landing page examples for startups and SaaS projects."),
  seed("Landingfolio", "https://www.landingfolio.com/", "inspiration", "UI Inspiration & Galleries", "landing pages, components", "Landing page patterns, sections, and page examples."),
  seed("Landings.dev", "https://landings.dev/", "inspiration", "UI Inspiration & Galleries", "landing pages, web design", "Modern landing page inspiration for product work."),
  seed("Godly", "https://godly.website/", "inspiration", "UI Inspiration & Galleries", "websites, inspiration", "Tasteful website inspiration with polished visual direction."),
  seed("Site of Sites", "https://www.siteofsites.co/", "inspiration", "UI Inspiration & Galleries", "websites, curation", "Curated websites for layout, branding, and interaction ideas."),
  seed("Webdesign Inspiration", "https://www.webdesign-inspiration.com/", "inspiration", "UI Inspiration & Galleries", "web design, inspiration", "Broad web design inspiration library."),
  seed("CSS Design Awards", "https://www.cssdesignawards.com/", "inspiration", "UI Inspiration & Galleries", "awards, css, web design", "Award-winning websites and creative frontend references."),
  seed("The FWA", "https://thefwa.com/", "inspiration", "UI Inspiration & Galleries", "awards, interactive", "Interactive and creative digital experience inspiration."),
  seed("Unsection", "https://www.unsection.com/", "inspiration", "UI Inspiration & Galleries", "sections, landing pages", "Section-level web design references."),
  seed("Brutalist Websites", "https://brutalistwebsites.com/", "inspiration", "UI Inspiration & Galleries", "brutalist, experimental", "Experimental brutalist web design references."),
  seed("Wix Studio Inspiration", "https://www.wix.com/studio/inspiration", "inspiration", "UI Inspiration & Galleries", "wix studio, inspiration", "Wix Studio website inspiration and client-site references."),
  seed("Dribbble", "https://dribbble.com/", "inspiration", "UI Inspiration & Galleries", "design, shots", "Design shots for UI, branding, and visual exploration."),
  seed("Behance", "https://www.behance.net/", "inspiration", "UI Inspiration & Galleries", "case studies, portfolio", "Portfolio case studies and full design presentations."),
  seed("Pinterest", "https://www.pinterest.com/", "inspiration", "UI Inspiration & Galleries", "moodboards, inspiration", "Moodboards, references, and visual research."),
  seed("Savee", "https://savee.it/", "inspiration", "UI Inspiration & Galleries", "moodboards, visual research", "Clean visual bookmarking and moodboard inspiration."),
  seed("Designspiration", "https://www.designspiration.com/", "inspiration", "UI Inspiration & Galleries", "visual research, moodboards", "Visual search and design inspiration."),
  seed("Visual Journal", undefined, "inspiration", "UI Inspiration & Galleries", "visual journal, inspiration", "Saved as a named reference from your inspiration list."),

  seed("Navbar Gallery", "https://www.navbar.gallery/", "inspiration", "UI Components, Patterns & UX References", "navbar, navigation, components", "Navigation patterns for web projects."),
  seed("Footer Design", "https://www.footer.design/", "inspiration", "UI Components, Patterns & UX References", "footer, components", "Footer examples and layout references."),
  seed("CTA Gallery", "https://www.ctagallery.com/", "inspiration", "UI Components, Patterns & UX References", "cta, conversion, sections", "Call-to-action examples for landing pages."),
  seed("Component Gallery", "https://component.gallery/", "inspiration", "UI Components, Patterns & UX References", "components, ui patterns", "UI component examples and interaction references."),
  seed("UIBits", "https://www.uibits.co/", "inspiration", "UI Components, Patterns & UX References", "ui patterns, components", "Curated UI component and layout bits."),
  seed("Refero", "https://refero.design/", "inspiration", "UI Components, Patterns & UX References", "ux, product, screenshots", "Product UI screenshots for UX and app patterns."),
  seed("Commerce Cream", "https://commercecream.com/", "inspiration", "UI Components, Patterns & UX References", "ecommerce, shopify", "Ecommerce website inspiration."),
  seed("SaaSpo", "https://saaspo.com/", "inspiration", "UI Components, Patterns & UX References", "saas, landing pages", "SaaS landing page and product website inspiration."),
  seed("OGfolio", "https://ogfolio.com/", "inspiration", "UI Components, Patterns & UX References", "portfolio, design", "Portfolio inspiration for creative professionals."),
  seed("Killer Portfolio", "https://killerportfolio.com/", "inspiration", "UI Components, Patterns & UX References", "portfolio, inspiration", "Portfolio references for designers and developers."),
  seed("Ecomm Design", "https://www.ecomm.design/", "inspiration", "UI Components, Patterns & UX References", "ecommerce, design", "Ecommerce design inspiration and examples."),
  seed("Supahero", "https://www.supahero.io/", "inspiration", "UI Components, Patterns & UX References", "hero sections, landing pages", "Hero section examples for landing pages."),
  seed("Inspo Page", "https://inspopage.com/", "inspiration", "UI Components, Patterns & UX References", "page inspiration, layouts", "Page inspiration and layout references."),
  seed("60fps Design", "https://www.60fps.design/", "inspiration", "UI Components, Patterns & UX References", "motion, interaction, ui", "Smooth UI and interaction inspiration."),
  seed("Dark Design", "https://www.dark.design/", "inspiration", "UI Components, Patterns & UX References", "dark ui, inspiration", "Dark-mode interface inspiration."),

  seed("Resource Boy Patterns", "https://resourceboy.com/", "assets", "Graphics, Illustrations, Patterns & Assets", "patterns, graphics", "Pattern and design resource references."),
  seed("Heritage Type", "https://www.heritagetype.com/", "assets", "Graphics, Illustrations, Patterns & Assets", "vintage, type, assets", "Vintage-inspired type, illustration, and design assets."),
  seed("LS Graphics", "https://www.ls.graphics/", "assets", "Graphics, Illustrations, Patterns & Assets", "mockups, assets, graphics", "Mockups, graphics, and premium visual assets."),
  seed("Every Tuesday Pattern Playground", "https://every-tuesday.com/pattern-playground/", "assets", "Graphics, Illustrations, Patterns & Assets", "patterns, playground", "Pattern creation and design resource inspiration."),
  seed("Grainient Supply", "https://grainient.supply/", "assets", "Graphics, Illustrations, Patterns & Assets", "gradients, grain, assets", "Grainy gradients and texture assets."),
  seed("Paaatterns", "https://www.ls.graphics/products/paaatterns", "assets", "Graphics, Illustrations, Patterns & Assets", "patterns, assets", "Pattern asset library reference."),
  seed("Open Peeps", "https://www.openpeeps.com/", "assets", "Graphics, Illustrations, Patterns & Assets", "illustrations, people", "Open-source people illustration library."),
  seed("Humaaans", "https://www.humaaans.com/", "assets", "Graphics, Illustrations, Patterns & Assets", "illustrations, people", "Mix-and-match human illustration library."),
  seed("Open Doodles", "https://www.opendoodles.com/", "assets", "Graphics, Illustrations, Patterns & Assets", "illustrations, doodles", "Free sketch-style illustration set."),
  seed("Feather Icons", "https://feathericons.com/", "assets", "Graphics, Illustrations, Patterns & Assets", "icons, svg", "Simple open-source icon set."),
  seed("ISO Icons", undefined, "assets", "Graphics, Illustrations, Patterns & Assets", "icons, isometric", "Saved as a named icon reference from your resource list."),
  seed("Pexels", "https://www.pexels.com/", "assets", "Graphics, Illustrations, Patterns & Assets", "photos, video, stock", "Free stock photo and video library."),

  seed("Fontshare", "https://www.fontshare.com/", "tools", "Typography & Color Tools", "fonts, typography", "Free fonts and type inspiration."),
  seed("Fontjoy", "https://fontjoy.com/", "tools", "Typography & Color Tools", "font pairing, typography", "Font pairing generator and typography helper."),
  seed("Realtime Colors", "https://www.realtimecolors.com/", "tools", "Typography & Color Tools", "color, palette, preview", "Color palette preview tool for UI themes."),
  seed("UI Gradients", "https://uigradients.com/", "tools", "Typography & Color Tools", "gradients, color", "Gradient inspiration and CSS references."),
  seed("Happy Hues", "https://www.happyhues.co/", "tools", "Typography & Color Tools", "color, palette", "Color palettes shown in real UI examples."),
  seed("Power Type", undefined, "tools", "Typography & Color Tools", "typography, type", "Saved as a named typography reference from your resource list."),
  seed("Collletttivo", "https://www.collletttivo.it/", "tools", "Typography & Color Tools", "fonts, typography", "Independent type foundry and font resource."),

  seed("Recraft AI", "https://www.recraft.ai/", "tools", "AI Tools & Generators", "ai, graphics, generation", "AI image and vector generation tool."),
  seed("Lummi AI", "https://www.lummi.ai/", "tools", "AI Tools & Generators", "ai, stock, images", "AI-generated stock imagery and visual assets."),
  seed("Midjourney", "https://www.midjourney.com/", "tools", "AI Tools & Generators", "ai, image generation", "AI image generation for concepts, art direction, and assets."),
  seed("Kling AI", "https://klingai.com/", "tools", "AI Tools & Generators", "ai, video", "AI video generation and motion exploration."),
  seed("Figmify", undefined, "tools", "AI Tools & Generators", "figma, ai", "Saved as a named AI/Figma tool reference from your resource list."),
  seed("Remove.bg", "https://www.remove.bg/", "tools", "AI Tools & Generators", "background removal, images", "Background removal utility for image cleanup."),

  seed("Spline", "https://spline.design/", "tools", "Motion, 3D & Interaction Tools", "3d, interaction, web", "3D design and interactive web scenes."),
  seed("Jitter", "https://jitter.video/", "tools", "Motion, 3D & Interaction Tools", "motion, animation", "Motion design tool for UI and social animations."),
  seed("Zajno Motion", "https://zajno.com/", "inspiration", "Motion, 3D & Interaction Tools", "motion, interaction, agency", "Motion and interaction inspiration from Zajno."),
  seed("Dither Garden", "https://dither.garden/", "tools", "Motion, 3D & Interaction Tools", "dither, graphics", "Dithered graphics and visual effects tool."),

  seed("Endless Tools", undefined, "tools", "Developer Tools & Utilities", "tools, utilities", "Saved as a named utility reference from your resource list."),
  seed("MageCDN SVG Loaders", "https://magecdn.com/tools/svg-loaders", "tools", "Developer Tools & Utilities", "svg, loaders, css", "SVG loader assets and animation utilities."),
  seed("Uiverse", "https://uiverse.io/", "tools", "Developer Tools & Utilities", "ui, css, components", "Community-made UI components and CSS snippets."),
  seed("Design System Checklist", "https://www.designsystemchecklist.com/", "tools", "Developer Tools & Utilities", "design system, checklist", "Checklist for auditing and building design systems."),
  seed("GitHub Design Resources", undefined, "learning", "Developer Tools & Utilities", "github, design resources", "Saved as a named GitHub resource list reference."),

  seed("UX Design CC", "https://uxdesign.cc/", "learning", "Learning, Content & Blogs", "ux, articles, learning", "UX design articles and product thinking."),
  seed("Curated Design", "https://www.curated.design/", "learning", "Learning, Content & Blogs", "design, curation, learning", "Curated design references and learning links."),
  seed("Craftwork Design", "https://craftwork.design/", "learning", "Learning, Content & Blogs", "design resources, learning", "Design resources, assets, and learning materials."),

  seed("Showit Store", "https://showit.com/store/", "assets", "Templates & Marketplace", "templates, marketplace", "Showit templates and marketplace inspiration."),

  seed("Bento Grids", "https://bentogrids.com/", "inspiration", "Misc / Unique Tools & Concepts", "bento, layouts", "Bento layout inspiration for dashboards and landing pages."),
  seed("Uncut WTF", "https://uncut.wtf/", "tools", "Misc / Unique Tools & Concepts", "fonts, type, unique", "Free type and experimental typography reference."),
];
