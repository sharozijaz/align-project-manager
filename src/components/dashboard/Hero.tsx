import { Glance } from "./Glance";

export function Hero() {
  return (
    <section className="relative overflow-hidden rounded-lg bg-[#050817] px-4 pb-24 pt-4 text-white sm:px-8">
      <div className="absolute inset-0 opacity-45">
        <img src="/hero-texture.svg" alt="" className="h-full w-full object-cover" />
      </div>
      <div className="relative z-10">
        <div className="grid gap-8 py-16 md:grid-cols-[1fr_220px] md:items-start">
          <h1 className="max-w-xl text-6xl font-light leading-none tracking-normal sm:text-7xl">
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
