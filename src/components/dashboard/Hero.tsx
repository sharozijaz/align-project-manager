import { getHeroOption, useHeroStore } from "../../store/heroStore";
import { Glance } from "./Glance";

export function Hero() {
  const heroImage = useHeroStore((state) => state.heroImage);
  const activeHero = getHeroOption(heroImage);

  return (
    <section className="relative overflow-hidden rounded-[var(--radius-lg)] bg-[#050817] px-4 pb-12 pt-4 text-white shadow-[var(--shadow-sm)] sm:px-7 sm:pb-16">
      <div className="absolute inset-0">
        <img key={activeHero.value} src={activeHero.src} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050817]/80 via-[#050817]/45 to-[#050817]/70" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#050817]/80 to-transparent" />
      </div>
      <div className="relative z-10">
        <div className="grid min-h-[280px] gap-6 py-8 sm:min-h-0 sm:gap-8 sm:py-12 md:grid-cols-[1fr_220px] md:items-start">
          <h1 className="max-w-xl text-5xl font-light leading-none tracking-normal sm:text-6xl">
            Today
            <br />
            Priorities
          </h1>
          <Glance />
        </div>
      </div>
    </section>
  );
}
