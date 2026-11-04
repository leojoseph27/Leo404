import { CertificationsSection } from "@/components/ui/certifications-section";
import { CursorbotSection } from "@/components/ui/cursorbot-section";
import { SplineSceneBasic } from "@/components/ui/demo";
import { Entropy } from "@/components/ui/entropy";
import { EtherealShadow } from "@/components/ui/etheral-shadow";
import { WavyBackground } from "@/components/ui/wavy-background";
import { SiteHeader } from "@/components/ui/site-header";
import { Reveal } from "@/components/ui/reveal";
import { SkillBar } from "@/components/ui/skill-bar";
import { FaceHero } from "@/components/ui/face-hero";
import { IDENTITY } from "@/lib/profile/leo-profile";
import { leosAge } from "@/lib/profile/calculations";

const LEFT_SKILLS = [
  { name: "Python", pct: 95 },
  { name: "SQL", pct: 90 },
  { name: "HTML5", pct: 90 },
  { name: "CSS3", pct: 85 },
  { name: "JavaScript", pct: 80 },
  { name: "Java", pct: 85 },
];

const RIGHT_SKILLS = [
  { name: "React", pct: 75 },
  { name: "Flask", pct: 80 },
  { name: "PostgreSQL", pct: 85 },
  { name: "Machine Learning", pct: 80 },
  { name: "Generative AI", pct: 75 },
  { name: "Prompt Engineering", pct: 90 },
];

export default function Home() {
  return (
    <main className="w-full">
      <SiteHeader />

      {/* Section 0: interactive portrait intro (face reveal) */}
      <FaceHero />

      {/* Section 1: Robo hero - "Hi there" */}
      <section
        id="hero"
        className="w-full min-h-[100svh] bg-background overflow-hidden border-0 shrink-0"
      >
        <SplineSceneBasic />
      </section>

      {/* Section 2: Entropy (left) + About (right) */}
      <section id="entropy" className="w-full shrink-0 bg-black">
        <div
          id="about"
          className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-16 py-12 md:py-16 px-6 md:px-10 lg:px-16 scroll-mt-24"
        >
          <Reveal className="flex-shrink-0 w-[min(78vw,505px)]">
            <Entropy className="rounded-lg" size={505} />
          </Reveal>
          <div className="flex-1 min-w-0 text-white max-w-xl lg:max-w-none">
            <Reveal>
              <h2 className="section-title mb-4">My name is Leo Joseph.</h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="text-neutral-300 text-sm md:text-base lg:text-lg leading-relaxed mb-6">
                I am a dedicated technologist with a{" "}
                <strong className="text-white">
                  B.TECH (Honors) in Computer Science and Engineering
                </strong>{" "}
                (specialized in{" "}
                <strong className="text-white">Artificial Intelligence</strong>).
                Over the years, I&apos;ve developed a strong interest in building
                meaningful digital experiences, exploring AI-driven
                possibilities, and creating software that solves real-world
                problems. I enjoy learning continuously, experimenting with new
                technologies, and turning ideas into practical, well-crafted
                solutions. With a blend of creativity and technical expertise, I
                strive to grow as a developer who brings value, innovation, and
                clarity to every project I work on.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 mb-6 text-sm md:text-base">
                {[
                  ["age", String(leosAge() ?? IDENTITY.dateOfBirth.slice(0, 4))],
                  ["gender", "Male"],
                  ["language", "English, Malayalam, Hindi, Tamil"],
                  ["work", "Full-Stack developer"],
                  ["freelance", "available"],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <dt className="text-neutral-500 shrink-0">{k}:</dt>
                    <dd className="text-neutral-300">{v}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
            <Reveal delay={0.2}>
              <div className="flex flex-wrap gap-3">
                <a
                  href="/Resume.pdf?v=kwt-2026"
                  download="Leo-Joseph-CV.pdf"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-white/10 text-white hover:bg-white/20 transition-colors text-sm md:text-base font-medium"
                >
                  download CV
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </a>
                <a
                  href="/Resume.pdf?v=kwt-2026"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-white/10 text-white hover:bg-white/20 transition-colors text-sm md:text-base font-medium"
                >
                  view CV
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Section 3: Waves with glass overlay - my skills */}
      <section id="waves" className="w-full shrink-0 relative">
        <WavyBackground
          backgroundFill="rgb(0 0 0)"
          waveOpacity={0.5}
          className="w-full flex items-center justify-center p-4 md:p-10"
        >
          <Reveal className="w-full max-w-[75.26rem]">
            <div
              className="rounded-2xl border border-white/15 bg-black/70 md:backdrop-blur-md shadow-xl p-5 md:p-8"
              style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}
            >
              <h2 className="section-title mb-6 md:mb-8 text-center">
                My <span className="text-purple-400">Skills</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <div>
                  {LEFT_SKILLS.map((s) => (
                    <SkillBar key={s.name} {...s} />
                  ))}
                </div>
                <div>
                  {RIGHT_SKILLS.map((s) => (
                    <SkillBar key={s.name} {...s} />
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </WavyBackground>
      </section>

      {/* Section 4: Smokebg – overlaps bottom of waves with blend gradient */}
      <section
        id="qualification"
        className="w-full shrink-0 relative min-h-[83vh] px-4 md:px-6 -mt-[10vh] md:-mt-[21vh] pt-[10vh] md:pt-[21vh]"
      >
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            maskImage: "linear-gradient(to bottom, transparent 0%, black 30%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 30%)",
            maskSize: "100% 100%",
            WebkitMaskSize: "100% 100%",
          }}
        >
          <EtherealShadow
            color="rgba(128, 128, 128, 1)"
            animation={{ scale: 100, speed: 90 }}
            noise={{ opacity: 1, scale: 1.2 }}
            sizing="fill"
            className="w-full h-full"
          />
        </div>
        <Reveal className="relative z-10 w-full max-w-[75.26rem] mx-auto my-12 md:my-16">
          <div
            className="rounded-2xl border border-white/15 bg-black/60 md:backdrop-blur-md shadow-xl p-5 md:p-10"
            style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}
          >
            <h2 className="section-title mb-8 text-center">
              My <span className="text-purple-400">Qualification</span>
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
              {/* Education - purple vertical line */}
              <div className="space-y-0">
                <TimelineItem
                  dates="Dec 2021 – Jul 2025"
                  title="B.TECH (Honors) In Computer Science and Engineering (Specialization in Artificial Intelligence)"
                  body="Karunya Institute of Technology and Sciences, Tamil Nadu, India
CGPA: 7.92"
                  icon="school"
                />
                <TimelineItem
                  dates="Jun 2019 – Jul 2021"
                  title="Higher Secondary Education"
                  body="Good Shepherd Public School and Junior College, Kerala, India
CBSE – 86.4%"
                  icon="school"
                />
                <TimelineItem
                  dates="Jun 2018 – May 2019"
                  title="Secondary Education"
                  body="United Indian School, Kuwait
CBSE – 83%"
                  icon="school"
                  last
                />
              </div>
              {/* Experience - purple vertical line */}
              <div className="space-y-0">
                <TimelineItem
                  dates="March 2026 – Ongoing"
                  title="Full Stack Developer – Al-Nassim Golden Group"
                  body={"• Developing Al-Nassim\u2019s digital platform, including an e-commerce website, PIM system, and web applications for product and inventory management.\n• Building an AI-powered product management system with barcode/ND scanning, product entry, Excel automation, image management, and Supabase integration."}
                  icon="work"
                />
                <TimelineItem
                  dates="June 2025 – Jan 2026"
                  title="Full Stack Developer with AI & Machine Learning Assistance – QB Tech Solutions, Kerala"
                  body="• Developed React-based web apps with a PostgreSQL backend and built an AI chatbot using Node.js.
• Deployed the company website and handled web development, technical support, and system issue resolution."
                  icon="work"
                />
                <TimelineItem
                  dates="Jan – Mar 2025"
                  title="AI Intern – Workcohol Solutions Pvt. Ltd., Chennai"
                  body="• Developed an AI Quiz Generator using Google GenAI and Flask.
• Managed prompt engineering, model integration, and frontend logic."
                  icon="work"
                />
                <TimelineItem
                  dates="May – Jul 2024"
                  title="AI & Web Development Intern – British Link Kuwait (BLK), Kuwait"
                  body="• Built a custom generative AI chatbot for company QA processes.
• Assisted with website updates and hardware maintenance tasks."
                  icon="work"
                  last
                />
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Certifications – separate section (not part of smokebg) */}
      <CertificationsSection />

      {/* Cursorbot – interactive 3D robot section, left-aligned under certifications */}
      <CursorbotSection />
    </main>
  );
}

const SCHOOL_ICON = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
);
const WORK_ICON = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
);

function TimelineItem({
  dates,
  title,
  body,
  icon,
  last = false,
}: {
  dates: string;
  title: string;
  body: string;
  icon: "school" | "work";
  last?: boolean;
}) {
  return (
    <div className={`relative flex gap-4 border-l-2 border-purple-500 pl-5 ml-4 ${last ? "pb-0" : "pb-8"}`}>
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white absolute left-0 -translate-x-1/2 top-0">
        {icon === "school" ? SCHOOL_ICON : WORK_ICON}
      </div>
      <div className="pl-2">
        <span className="text-neutral-400 text-sm md:text-base">{dates}</span>
        <h3 className="text-white font-semibold mt-1 text-base md:text-xl leading-snug">
          {title}
        </h3>
        <p className="text-neutral-300 text-sm md:text-base mt-2 whitespace-pre-line">
          {body}
        </p>
      </div>
    </div>
  );
}
