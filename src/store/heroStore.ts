export const heroOptions = [
  {
    value: "align-gradient-emerald",
    label: "Emerald Glass",
    description: "Muted emerald glass gradient",
    src: "/heroes/align-gradient-emerald.png",
  },
  {
    value: "align-gradient-mist",
    label: "Mist Glass",
    description: "Soft blue-violet workspace gradient",
    src: "/heroes/align-gradient-mist.png",
  },
  {
    value: "align-gradient-amber",
    label: "Amber Glass",
    description: "Warm muted delivery gradient",
    src: "/heroes/align-gradient-amber.png",
  },
  {
    value: "align-gradient-violet",
    label: "Violet Glass",
    description: "Focused violet gradient",
    src: "/heroes/align-gradient-violet.png",
  },
] as const;

export type HeroImageKey = (typeof heroOptions)[number]["value"];

export function getHeroOption(heroImage: HeroImageKey) {
  return heroOptions.find((option) => option.value === heroImage) ?? heroOptions[0];
}
