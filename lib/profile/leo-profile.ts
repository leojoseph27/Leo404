/**
 * Leo Joseph — centralized personal profile (Layer A: permanent knowledge).
 * =========================================================================
 *
 * This file is the SINGLE AUTHORITATIVE SOURCE for every verified personal
 * fact about Leo Joseph Perumpully. The chatbot, the portfolio page and any
 * future consumer must read personal facts from here — never from scattered
 * prompts, conversation messages, or duplicated hardcoded values.
 *
 * Update policy:
 *   - Only the developer updates this file (via a normal code change).
 *   - Ordinary visitors can never modify it: chat conversations are never
 *     written back into the profile (see app/api/chatbot/route.ts).
 *   - When a fact changes, update `value` and bump `lastUpdated`.
 *
 * Source priority (highest first) — see resolveConflicts notes:
 *   1. Explicitly verified information provided by Leo      -> "leo_verified"
 *   2. Latest verified resume/CV (2026 version)             -> "resume_2026"
 *   3. Official portfolio content / project records         -> "portfolio"
 *   4. Existing knowledge-base material                     -> "knowledge_base"
 *   5. Conversation history (only Leo-verified items)       -> "conversation"
 *
 * Dates are ISO 8601 (YYYY-MM-DD) so deterministic calculations in
 * calculations.ts never have to guess the format.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FactCategory =
  | "identity"
  | "education"
  | "current_employment"
  | "previous_employment"
  | "technical_skills"
  | "soft_skills"
  | "projects"
  | "certifications"
  | "achievements"
  | "interests"
  | "contact";

export type FactStatus = "verified" | "needs_review" | "inferred";

export interface PersonalFact {
  /** Unique, stable id, e.g. "identity.date_of_birth". */
  id: string;
  category: FactCategory;
  /** Attribute name, e.g. "date_of_birth". */
  field: string;
  /** Verified value. Stored as data (ISO dates), never as prose. */
  value: string | number | boolean | string[];
  /** Where this value came from (one of the sources listed above). */
  source: string;
  status: FactStatus;
  /** ISO date of the last verification/update. */
  lastUpdated: string;
  /** Optional context for the developer; never shown to visitors. */
  notes?: string;
}

// ---------------------------------------------------------------------------
// Structured profile — the data the retrieval and calculation services use.
// ---------------------------------------------------------------------------

export const IDENTITY = {
  fullName: "Leo Joseph Perumpully",
  shortName: "Leo Joseph",
  dateOfBirth: "2003-06-18", // ISO; age is ALWAYS computed, never stored
  placeOfBirth: "Kerala, India",
  nationality: "Indian",
  homeAddress: "Perumpully House, Chalakudy, Thrissur, Kerala 680307, India",
  gender: "Male",
  availableForFreelance: true,
} as const;

export const EDUCATION = {
  degree: "B.Tech (Honours) in Computer Science and Engineering",
  specialization: "Artificial Intelligence",
  university: "Karunya Institute of Technology and Sciences",
  universityLocation: "Coimbatore, Tamil Nadu, India",
  fieldOfStudy: "Software and applications development and analysis",
  startDate: "2021-12-13",
  graduationDate: "2025-07-15",
  cgpa: 7.92,
  cgpaEqfLevel: 6,
  secondary: {
    school: "Good Shepherd Public School and Junior College, Kerala",
    board: "CBSE",
    percentage: 86.4,
    period: "2019-2021",
  },
  highSchool: {
    school: "United Indian School, Kuwait",
    board: "CBSE",
    percentage: 83,
    period: "2018-2019",
  },
} as const;

export interface Employment {
  employer: string;
  location: string;
  title: string;
  type: "full_time" | "internship";
  startDate: string;
  /** ISO date, or null for "present". */
  endDate: string | null;
  responsibilities: string[];
  highlights?: string[];
}

export const EMPLOYMENT: Employment[] = [
  {
    employer: "Al-Nassim Golden Group",
    location: "Kuwait City, Kuwait",
    title: "Full-Stack Developer",
    type: "full_time",
    startDate: "2026-03-08",
    endDate: null,
    responsibilities: [
      "Developing and maintaining a scalable e-commerce platform using modern full-stack web technologies",
      "Performing data analysis and product information management (PIM) to improve inventory accuracy and business insights",
      "Building AI-assisted tools to automate product categorization, content generation and workflow optimisation",
      "Collaborating with stakeholders to enhance website performance, user experience and operational efficiency",
    ],
    highlights: [
      "Building an AI-powered product management system with barcode/ND scanning, product entry, Excel automation, image management and Supabase integration",
    ],
  },
  {
    employer: "QB Tech Solutions",
    location: "Kerala, India",
    title: "Full-Stack Developer (with AI & Machine Learning assistance)",
    type: "full_time",
    startDate: "2025-06-01",
    endDate: "2026-01-24",
    responsibilities: [
      "Developed enterprise web applications using React.js, Node.js and PostgreSQL, including a role-based task management platform",
      "Assisted AI/computer-vision solutions including face recognition, ID card detection, and intelligent attendance & access management systems",
      "Built AI-powered chatbot solutions",
      "Contributed across the full software development lifecycle (design, implementation, testing, deployment, technical support)",
    ],
  },
  {
    employer: "Workcohol Solutions Pvt. Ltd.",
    location: "Chennai, India",
    title: "AI Intern",
    type: "internship",
    startDate: "2025-01-05",
    endDate: "2025-03-15",
    responsibilities: [
      "Developed an AI-powered educational platform using Flask and Google Generative AI",
      "Implemented intelligent document processing that generated question papers from user-uploaded study materials",
      "Built AI modules for automated answer key generation, response evaluation, feedback on incorrect answers and personalised revision notes",
      "Leveraged prompt engineering for context-aware educational assistance",
    ],
  },
  {
    employer: "British Link Kuwait (BLK)",
    location: "Kuwait City, Kuwait",
    title: "AI & Web Development Intern",
    type: "internship",
    startDate: "2024-05-21",
    endDate: "2024-07-04",
    responsibilities: [
      "Developed a custom generative AI chatbot to automate company queries and improve internal information access",
      "Assisted in website development, updates and maintenance",
      "Provided networking and hardware support",
      "Gained hands-on experience integrating AI solutions into real-world business workflows",
    ],
  },
];

export const CURRENT_EMPLOYER = EMPLOYMENT[0];

export const TECHNICAL_SKILLS = {
  /** Proficiencies as published on the portfolio (percent = displayed level). */
  proficiency: [
    { name: "Python", level: 95 },
    { name: "SQL", level: 90 },
    { name: "Prompt Engineering", level: 90 },
    { name: "HTML5", level: 90 },
    { name: "Java", level: 85 },
    { name: "CSS3", level: 85 },
    { name: "PostgreSQL", level: 85 },
    { name: "Machine Learning", level: 80 },
    { name: "Flask", level: 80 },
    { name: "JavaScript", level: 80 },
    { name: "React", level: 75 },
    { name: "Generative AI", level: 75 },
  ],
  alsoWorkedWith: [
    "Node.js",
    "Supabase",
    "TensorFlow",
    "scikit-learn",
    "NLTK",
    "Librosa",
    "Tableau",
    "Kotlin/Android",
  ],
  domains: [
    "Machine learning",
    "Data science",
    "Computer vision",
    "Generative AI",
    "Full-stack development",
  ],
  languages: [
    { name: "English", level: "C1-C2 (IELTS 7.5)" },
    { name: "Malayalam", level: "Native" },
  ],
  /** Website-only claims pending Leo's confirmation — see CONFLICTS. */
  spokenLanguagesUnverified: ["Hindi", "Tamil"],
} as const;

export const SOFT_SKILLS = [
  "Cross-functional collaboration with stakeholders",
  "Full software development lifecycle ownership (design to deployment and support)",
  "Prompt engineering and applied AI problem-solving",
  "Technical communication (Best Presenter Award, AGAIQCSD-2024)",
] as const;

export interface Project {
  name: string;
  tagline: string;
  startDate: string;
  endDate: string;
  url?: string;
  description: string;
}

export const PROJECTS: Project[] = [
  {
    name: "AQUANUTRI",
    tagline: "AI-Based Nutritional Deficiency Detection & Fish Recommendation System",
    startDate: "2024-01-01",
    endDate: "2024-04-08",
    url: "https://leo861-aquanutri.hf.space/",
    description:
      "Deep-learning model for skin-based nutritional deficiency detection (fine-tuned ResNet50 on DermNet detecting markers of iron, B12, vitamin D, zinc deficits); personalized dietary recommendations mapping detected deficiencies to nutrient-rich fish using integrated datasets; supports terrace aquaculture. (The website presents the dermatology and fish-recommender parts as two related 2024 projects; the resume merges them under AQUANUTRI.)",
  },
  {
    name: "AI Quiz Generator",
    tagline: "Context-aware MCQ generation from user documents",
    startDate: "2025-01-04",
    endDate: "2025-03-13",
    url: "https://leojoseph975-smart-quiz.hf.space/",
    description:
      "AI-powered web app generating context-aware MCQs from user text/uploads (PDF, DOCX, TXT); integrated Google Generative AI (Gemini 2.0 Flash) for automated question creation with adjustable difficulty and counts; Flask backend deployed for real-time use; produces options, correct answers, explanations, timers, scores, analytics, downloadable PDF reports and study notes.",
  },
  {
    name: "Heart Condition Analyzer (CardioAI)",
    tagline: "Multimodal cardiovascular risk prediction",
    startDate: "2025-02-16",
    endDate: "2025-05-09",
    url: "https://leo861-coeur.hf.space/",
    description:
      "Multimodal system fusing ECG signals, heart sounds (phonocardiography) and clinical data for cardiovascular risk prediction; convolutional autoencoder for unsupervised ECG anomaly detection; deep learning + transfer learning (YAMNet embeddings) classifying stenosis, regurgitation and valve disorders; MFCC/spectrogram features; deployed with real-time dashboards and an AI chatbot for patient guidance.",
  },
  {
    name: "Asthma Monitoring System",
    tagline: "AI asthma risk prediction with real-time alerts",
    startDate: "2026-01-10",
    endDate: "2026-02-02",
    url: "https://leo861-breathe.hf.space/",
    description:
      "AI model for asthma risk prediction; processed respiratory and environmental data streams; implemented a real-time alert system for early intervention.",
  },
  {
    name: "Mental Health Chatbot",
    tagline: "Emotion-aware AI companion",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    description:
      "Secure, empathetic AI companion using emotion recognition: NLP with ICD-10 symptom keywords for sentiment/intent/distress detection; EMA check-ins monitoring mood; EMI coping strategies and escalation to professionals when risk rises; Librosa + Bi-LSTM vocal-tone analysis; offline SMS support, text-to-speech and haptic feedback for accessibility. (Year given as 2024; exact dates not on record.)",
  },
  {
    name: "Food Sentiment Analysis",
    tagline: "NLP classification of Amazon food reviews",
    startDate: "2023-01-01",
    endDate: "2023-12-31",
    description:
      "NLP/ML pipeline classifying Amazon food reviews (binary sentiment) with TF-IDF + n-grams and Logistic Regression; authenticity evaluation labelling reviews \"Authentic\" vs \"Fake or Biased\"; conditional improvement suggestions for negative authentic reviews. (Year given as 2023; exact dates not on record.)",
  },
];

export const CERTIFICATIONS = [
  { name: "Microsoft Certified: Azure Fundamentals", issuer: "Microsoft", date: "2024-11-06" },
  { name: "AWS Knowledge: Cloud Essentials Training Badge", issuer: "AWS", date: "2024-06-30" },
  { name: "Microsoft Certified: Security, Compliance & Identity Fundamentals", issuer: "Microsoft", date: "2024-02-16" },
  { name: "Meta Android Developer professional certificate", issuer: "Meta (Coursera)", date: "2024-10-22", details: "Kotlin, Android Studio, API integration, testing/deployment" },
  { name: "Cisco Ethical Hacker", issuer: "Cisco", date: "2024-10-02" },
  { name: "Google Data Analytics specialization", issuer: "Google (Coursera)", date: "2024-02-21", details: "SQL, spreadsheets, Tableau" },
  { name: "Google Cybersecurity specialization", issuer: "Google (Coursera)", date: "2024-02-19", details: "Linux, Python, SIEM" },
  { name: "Microsoft Certified: Azure AI Fundamentals", issuer: "Microsoft", date: "2022-11-28" },
  { name: "IBM Getting Started with Enterprise-grade AI", issuer: "IBM", date: "2023-10-26" },
  { name: "Google Cloud Computing Foundations: Infrastructure", issuer: "Google Cloud", date: "2023-09-18" },
  { name: "Data, ML & AI in Google Cloud", issuer: "Google Cloud", date: "2023-09-18" },
] as const;

export const ACHIEVEMENTS = [
  {
    title: "Best Presenter Award",
    event: "SERB-sponsored international conference AGAIQCSD-2024",
    where: "Erode Sengunthar Engineering College",
    date: "2024-10-03",
    detail: "For the AQUANUTRI terrace fish-cultivation paper.",
  },
  {
    title: "Top 10 Finalist (Kerala–Tamil Nadu region)",
    event: "SSN iFound Startup Challenge",
    where: "SSN College of Engineering",
    date: "2025-02-28",
    detail: "For personalized dietary recommendations via a data-driven decision support system.",
  },
] as const;

export const PUBLICATIONS = [
  {
    title: "Aquanutri: A Mobile Platform for Skin-Based Deficiency Detection and Nutrient-Rich Fish Recommendation",
    authors: "Leo Joseph, Dr. M. Rajeswari, Steffi Joseph",
    venue: "Provincia Journal Vol. 24 No. 01 (2025)",
  },
] as const;

export const INTERESTS = {
  hobbies: [
    "Drawing, painting and arts",
    "Basketball",
    "Swimming",
    "Crafting",
    "Watching movies and series",
  ],
  professionalAreas: [
    "AI & ML",
    "Data Science & Analytics",
    "Generative AI & NLP",
    "Healthcare AI systems",
    "Computer Vision",
    "Research & Innovation",
    "Environmental Technology & Sustainability",
  ],
  careerGoal:
    "Applying intelligent, data-driven approaches to solve real-world problems while pursuing advanced research in Artificial Intelligence and Data Science.",
} as const;

export const CONTACT = {
  phone: "(+965) 66235398",
  email: "leojoseph975@gmail.com",
  portfolio: "https://leojoseph975-leo-joseph.hf.space/",
  github: "https://github.com/leojoseph27",
  /** Needs Leo's confirmation — see CONFLICTS. */
  linkedin: "https://linkedin.com/in/leo-joseph-351aba232",
  linkedinAlternate: "https://linkedin.com/in/leo-joseph-perumpully",
} as const;

export const ABOUT_SUMMARY =
  "Computer Science graduate with a strong foundation in machine learning, data science, computer vision and generative AI, complemented by research and full-stack development experience. Passionate about applying intelligent, data-driven approaches to solve real-world problems while pursuing advanced research in Artificial Intelligence and Data Science.";

// ---------------------------------------------------------------------------
// Unresolved conflicts — preserved for review, never presented as verified.
// ---------------------------------------------------------------------------

export interface Conflict {
  id: string;
  field: string;
  values: { value: string; source: string }[];
  status: "needs_review";
  question: string;
}

export const CONFLICTS: Conflict[] = [
  {
    id: "conflict.linkedin_url",
    field: "contact.linkedin",
    values: [
      { value: "linkedin.com/in/leo-joseph-351aba232", source: "portfolio" },
      { value: "linkedin.com/in/leo-joseph-perumpully", source: "resume_2026" },
    ],
    status: "needs_review",
    question:
      "Two LinkedIn URLs exist (portfolio vs resume). Which one is the live profile?",
  },
  {
    id: "conflict.spoken_languages",
    field: "skills.spoken_languages",
    values: [
      { value: "English, Malayalam", source: "resume_2026" },
      { value: "English, Malayalam, Hindi, Tamil", source: "portfolio" },
    ],
    status: "needs_review",
    question:
      "The website lists Hindi and Tamil as spoken languages; the resume does not. Are they verified?",
  },
];

// ---------------------------------------------------------------------------
// Flat fact registry — one row per verified personal fact. Used by
// validation and by consumers that need id-addressable facts.
// ---------------------------------------------------------------------------

export const PERSONAL_FACTS: PersonalFact[] = [
  // Identity
  { id: "identity.full_name", category: "identity", field: "full_name", value: IDENTITY.fullName, source: "leo_verified", status: "verified", lastUpdated: "2026-11-04" },
  { id: "identity.date_of_birth", category: "identity", field: "date_of_birth", value: IDENTITY.dateOfBirth, source: "leo_verified", status: "verified", lastUpdated: "2026-11-04" },
  { id: "identity.place_of_birth", category: "identity", field: "place_of_birth", value: IDENTITY.placeOfBirth, source: "leo_verified", status: "verified", lastUpdated: "2026-11-04" },
  { id: "identity.nationality", category: "identity", field: "nationality", value: IDENTITY.nationality, source: "resume_2026", status: "verified", lastUpdated: "2026-11-04" },
  { id: "identity.home_address", category: "identity", field: "home_address", value: IDENTITY.homeAddress, source: "resume_2026", status: "verified", lastUpdated: "2026-11-04" },
  { id: "identity.gender", category: "identity", field: "gender", value: IDENTITY.gender, source: "portfolio", status: "verified", lastUpdated: "2026-11-04" },
  { id: "identity.freelance", category: "identity", field: "available_for_freelance", value: IDENTITY.availableForFreelance, source: "resume_2026", status: "verified", lastUpdated: "2026-11-04" },

  // Education
  { id: "education.degree", category: "education", field: "degree", value: EDUCATION.degree, source: "resume_2026", status: "verified", lastUpdated: "2026-11-04" },
  { id: "education.specialization", category: "education", field: "specialization", value: EDUCATION.specialization, source: "leo_verified", status: "verified", lastUpdated: "2026-11-04" },
  { id: "education.university", category: "education", field: "university", value: EDUCATION.university, source: "leo_verified", status: "verified", lastUpdated: "2026-11-04" },
  { id: "education.university_location", category: "education", field: "university_location", value: EDUCATION.universityLocation, source: "resume_2026", status: "verified", lastUpdated: "2026-11-04" },
  { id: "education.period", category: "education", field: "period", value: `${EDUCATION.startDate} to ${EDUCATION.graduationDate}`, source: "resume_2026", status: "verified", lastUpdated: "2026-11-04" },
  { id: "education.graduation_date", category: "education", field: "graduation_date", value: EDUCATION.graduationDate, source: "resume_2026", status: "verified", lastUpdated: "2026-11-04" },
  { id: "education.cgpa", category: "education", field: "cgpa", value: EDUCATION.cgpa, source: "resume_2026", status: "verified", lastUpdated: "2026-11-04" },

  // Employment
  ...EMPLOYMENT.map(
    (job): PersonalFact => ({
      id: `employment.${slug(job.employer)}.period`,
      category: job === CURRENT_EMPLOYER ? "current_employment" : job.type === "internship" ? "previous_employment" : "previous_employment",
      field: "period",
      value: `${job.startDate} to ${job.endDate ?? "present"}`,
      source: "resume_2026",
      status: "verified",
      lastUpdated: "2026-11-04",
      notes: `${job.title} at ${job.employer} (${job.type})`,
    })
  ),
  { id: "employment.al-nassim-golden-group.title", category: "current_employment", field: "title", value: CURRENT_EMPLOYER.title, source: "resume_2026", status: "verified", lastUpdated: "2026-11-04" },
  { id: "employment.al-nassim-golden-group.location", category: "current_employment", field: "location", value: CURRENT_EMPLOYER.location, source: "resume_2026", status: "verified", lastUpdated: "2026-11-04" },

  // Contact
  { id: "contact.email", category: "contact", field: "email", value: CONTACT.email, source: "resume_2026", status: "verified", lastUpdated: "2026-11-04" },
  { id: "contact.phone", category: "contact", field: "phone", value: CONTACT.phone, source: "resume_2026", status: "verified", lastUpdated: "2026-11-04" },
  { id: "contact.github", category: "contact", field: "github", value: CONTACT.github, source: "portfolio", status: "verified", lastUpdated: "2026-11-04" },
  { id: "contact.linkedin", category: "contact", field: "linkedin", value: CONTACT.linkedin, source: "portfolio", status: "needs_review", lastUpdated: "2026-11-04", notes: "Conflicts with resume URL — see CONFLICTS." },
  { id: "contact.portfolio", category: "contact", field: "portfolio", value: CONTACT.portfolio, source: "portfolio", status: "verified", lastUpdated: "2026-11-04" },

  // Languages / skills summary
  { id: "skills.english", category: "technical_skills", field: "language_english", value: "C1-C2 (IELTS 7.5)", source: "resume_2026", status: "verified", lastUpdated: "2026-11-04" },
  { id: "skills.malayalam", category: "technical_skills", field: "language_malayalam", value: "Native", source: "resume_2026", status: "verified", lastUpdated: "2026-11-04" },
  { id: "skills.spoken_languages_extra", category: "technical_skills", field: "spoken_languages_extra", value: [...TECHNICAL_SKILLS.spokenLanguagesUnverified], source: "portfolio", status: "needs_review", lastUpdated: "2026-11-04", notes: "Website-only; not on resume — see CONFLICTS." },
];

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** Look up a single fact by id. */
export function getFact(id: string): PersonalFact | undefined {
  return PERSONAL_FACTS.find((f) => f.id === id);
}
