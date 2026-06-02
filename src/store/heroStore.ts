export const heroOptions = [
  {
    value: "midnight-mountain",
    label: "Midnight Mountain",
    description: "Deep violet alpine sky",
    src: "/heroes/midnight-mountain.webp",
  },
  {
    value: "violet-dunes",
    label: "Violet Dunes",
    description: "Quiet desert horizon",
    src: "/heroes/violet-dunes.webp",
  },
  {
    value: "neon-skyline",
    label: "Neon Skyline",
    description: "Blue city after dark",
    src: "/heroes/neon-skyline.webp",
  },
  {
    value: "moonlit-ocean",
    label: "Moonlit Ocean",
    description: "Calm night water",
    src: "/heroes/moonlit-ocean.webp",
  },
  {
    value: "shadow-peaks",
    label: "Shadow Peaks",
    description: "Soft mountain silhouette",
    src: "/heroes/shadow-peaks.webp",
  },
  {
    value: "morning-lake",
    label: "Morning Lake",
    description: "Warm light workspace",
    src: "/heroes/morning-lake.webp",
  },
  {
    value: "aqua-ribbon",
    label: "Aqua Ribbon",
    description: "Clean glass waves",
    src: "/heroes/aqua-ribbon.webp",
  },
  {
    value: "violet-city",
    label: "Violet City",
    description: "Rainlit future skyline",
    src: "/heroes/violet-city.webp",
  },
  {
    value: "mist-ink-mountains",
    label: "Mist Ink Mountains",
    description: "Quiet ink landscape",
    src: "/heroes/mist-ink-mountains.webp",
  },
  {
    value: "luminous-grove",
    label: "Luminous Grove",
    description: "Bright fantasy garden",
    src: "/heroes/luminous-grove.webp",
  },
  {
    value: "ember-village",
    label: "Ember Village",
    description: "Warm old-world town",
    src: "/heroes/ember-village.webp",
  },
  {
    value: "sky-citadel",
    label: "Sky Citadel",
    description: "Light fantasy vista",
    src: "/heroes/sky-citadel.webp",
  },
  {
    value: "pixel-valley",
    label: "Pixel Valley",
    description: "Playful bright valley",
    src: "/heroes/pixel-valley.webp",
  },
  {
    value: "island-kingdom",
    label: "Island Kingdom",
    description: "World map view",
    src: "/heroes/island-kingdom.webp",
  },
  {
    value: "candlekeep-tavern",
    label: "Candlekeep Tavern",
    description: "Candlelit focus room",
    src: "/heroes/candlekeep-tavern.webp",
  },
  {
    value: "ringed-planet",
    label: "Ringed Planet",
    description: "Deep space calm",
    src: "/heroes/ringed-planet.webp",
  },
  {
    value: "orbital-station",
    label: "Orbital Station",
    description: "Work above Earth",
    src: "/heroes/orbital-station.webp",
  },
  {
    value: "galaxy-outpost",
    label: "Galaxy Outpost",
    description: "Purple alien horizon",
    src: "/heroes/galaxy-outpost.webp",
  },
  {
    value: "cloud-realm",
    label: "Cloud Realm",
    description: "Soft pastel sky",
    src: "/heroes/cloud-realm.webp",
  },
  {
    value: "pixel-spaceport",
    label: "Pixel Spaceport",
    description: "Retro cosmic base",
    src: "/heroes/pixel-spaceport.webp",
  },
] as const;

export type HeroImageKey = (typeof heroOptions)[number]["value"];

export function getHeroOption(heroImage: HeroImageKey) {
  return heroOptions.find((option) => option.value === heroImage) ?? heroOptions[0];
}
