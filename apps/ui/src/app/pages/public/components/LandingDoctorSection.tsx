import { LandingSectionHeading } from '@/app/pages/public/components/LandingSectionHeading';
import { DOCTOR_PROFILE } from '@/app/pages/public/landingContent';

export function LandingDoctorSection() {
  return (
    <section id="doctor" className="relative scroll-mt-20 overflow-hidden bg-neutral-950 py-16 md:py-24">
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{ background: 'radial-gradient(ellipse at top right, #1EABB3, transparent 60%)' }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <LandingSectionHeading
          variant="split"
          accent="pink"
          align="center"
          eyebrow="Meet Your Doctor"
          title="In expert hands,"
          subtitle="at your doorstep."
          description="Your FibroScan is performed and interpreted by a board-certified gastroenterologist — not a technician."
        />

        <div className="mt-12 flex flex-col items-start gap-12 lg:flex-row lg:gap-14">
          <div className="mx-auto w-full max-w-sm shrink-0 lg:mx-0 lg:w-80">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/60">
              <img
                src={DOCTOR_PROFILE.photo}
                alt={DOCTOR_PROFILE.name}
                className="aspect-[4/5] w-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <p className="text-xl font-bold leading-tight text-white">{DOCTOR_PROFILE.name}</p>
                <p className="mt-1 text-sm text-livotale-teal">{DOCTOR_PROFILE.credentials}</p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <p className="text-base font-semibold text-white">Memberships & Fellowships</p>
              <ul className="mt-3 space-y-2.5">
                {DOCTOR_PROFILE.memberships.map((m) => (
                  <li key={m} className="flex items-start gap-2 text-sm leading-relaxed text-neutral-400">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-livotale-pink" />
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-10">
            <div>
              <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-white md:text-lg">
                <span className="h-px w-6 bg-livotale-teal" />
                Procedures & Expertise
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {DOCTOR_PROFILE.procedures.map((s) => (
                  <div key={s} className="flex items-start gap-2 text-sm text-neutral-400 md:text-base">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-livotale-teal" />
                    {s}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-white md:text-lg">
                <span className="h-px w-6 bg-livotale-pink" />
                Education
              </h3>
              <div className="flex flex-col gap-4">
                {DOCTOR_PROFILE.education.map((e) => (
                  <div key={e.degree} className="flex items-start gap-4">
                    <span className="shrink-0 font-mono text-sm font-bold text-livotale-pink">{e.year}</span>
                    <div>
                      <p className="text-base font-medium text-white">{e.degree}</p>
                      <p className="mt-0.5 text-sm text-neutral-500">{e.institute}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-white md:text-lg">
                <span className="h-px w-6 bg-livotale-teal" />
                Experience
              </h3>
              <div className="relative flex flex-col gap-5 border-l border-white/10 pl-5">
                {DOCTOR_PROFILE.experience.map((ex) => (
                  <div key={ex.place + ex.period} className="relative">
                    <span className="absolute -left-[23px] top-1.5 h-2 w-2 rounded-full border-2 border-neutral-950 bg-livotale-teal" />
                    <p className="text-base font-medium text-white">{ex.role}</p>
                    <p className="mt-0.5 text-sm text-neutral-400">{ex.place}</p>
                    <p className="mt-0.5 text-sm text-livotale-pink">{ex.period}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
