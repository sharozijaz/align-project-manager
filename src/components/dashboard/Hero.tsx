import { Glance } from "./Glance";

export function Hero() {
  return (
    <section className="relative overflow-hidden rounded-lg bg-[#050817] px-3 pb-16 pt-3 text-white sm:px-8 sm:pb-24 sm:pt-4">
      <div className="absolute inset-0 opacity-45">
        <img src="/hero-texture.svg" alt="" className="h-full w-full object-cover" />
      </div>
      <div className="relative z-10">
        <div className="grid min-h-[360px] gap-6 py-10 sm:min-h-0 sm:gap-8 sm:py-16 md:grid-cols-[1fr_220px] md:items-start">
          <h1 className="max-w-xl text-5xl font-light leading-none tracking-normal sm:text-7xl">
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
