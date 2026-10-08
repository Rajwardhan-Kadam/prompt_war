import { RoundInfo, Participant, Submission, EventState } from '../types';

export const ROUNDS_INFO: Record<1 | 2 | 3, RoundInfo> = {
  1: {
    id: 1,
    title: 'Round 01 — Prompt to Picture',
    subtitle: 'Image Generation Challenge',
    timeLimitMinutes: 10,
    location: 'Classroom',
    level: 'Easy',
    description: "Participants receive a simple theme or topic from the organizers and use prompt engineering to create an image with a permitted AI image-generation tool.",
    keyTasks: [
      'Understand the given topic.',
      'Write a suitable image-generation prompt.',
      'Generate the image using a permitted AI image generator.',
      'Take a mobile screenshot showing the prompt and generated output.',
      'Submit the screenshot through the official submission link before the round closes.',
      'Submit all required work before the round closes.'
    ],
    submissionRequirements: [
      'Mobile screenshot showing BOTH prompt text and generated output',
      'Exact written prompt string used in the tool',
      'Name of permitted AI tool used (e.g., Midjourney, DALL-E, Ideogram, Imagen)'
    ],
    submissionType: 'image_screenshot'
  },
  2: {
    id: 2,
    title: 'Round 02 — Scenario Sprint',
    subtitle: 'Situation-Based Prompting',
    timeLimitMinutes: 10,
    location: 'Computer Lab',
    level: 'Intermediate',
    description: "Each participant randomly receives a scenario chit describing a situation in approximately 15 words. They must turn it into a clear prompt and generate a relevant AI output.",
    keyTasks: [
      'Read and understand the randomly assigned scenario chit.',
      'Convert the scenario into an effective prompt.',
      'Generate the required output using a permitted AI tool.',
      'Refine the prompt if necessary within the available window.',
      'Submit the final prompt and output before the deadline.',
      'Submit all required work before the round closes.'
    ],
    submissionRequirements: [
      'Assigned 15-word scenario chit',
      'Refined prompt and iterative adjustments log',
      'Generated output text or media result',
      'Permitted AI tool used'
    ],
    submissionType: 'text_and_output'
  },
  3: {
    id: 3,
    title: 'Round 03 — Prompt to Product',
    subtitle: 'AI-Assisted Development Finale',
    timeLimitMinutes: 30,
    location: 'Computer Lab',
    level: 'Advanced / Final Round',
    description: "Participants transform a product requirement or problem statement into a working digital prototype using an AI-assisted development tool and iterative prompts.",
    keyTasks: [
      'Understand the assigned product requirement.',
      'Write prompts to instruct an AI coding or development tool.',
      'Generate and refine the product using iterative prompts.',
      'Create a functional prototype containing the required features.',
      'Present or demonstrate the final product when requested by the judges.',
      'Submit all required work before the round closes.'
    ],
    submissionRequirements: [
      'Functional prototype URL or deployed demo link',
      'Public GitHub / Code repository link',
      'Iterative prompting workflow log',
      'Live demonstration ready for judges'
    ],
    submissionType: 'product_prototype'
  }
};

export const SAMPLE_ROUND1_THEMES = [
  "Bioluminescent Marine Fauna Synthesizing Renewable Solar Energy in 2140",
  "Ancient Vedic Astronomer Calculating Cosmic Planetary Alignments via Brass Sextants",
  "Robotic Pollinator Swarm Restoring Flora in a Futuristic Glass Biodome",
  "Cyberpunk Chai Stall Operating Under Monsoon Rains with Holographic Menus",
  "Deep Space Telescope Capturing a Stellar Nursery Shaped Like a Phoenix"
];

export const SAMPLE_SCENARIO_CHITS = [
  "Deep-sea submarine loses engine; sonar detects an enormous bio-synthetic whale swimming directly toward the hull.",
  "Mars orbital greenhouse oxygen scrubber fails; a solitary botanist must balance carbon dioxide levels immediately.",
  "Archaeologist opens centuries-old vault in Varanasi, triggering a harmless holographic projection of lost star charts.",
  "Smart traffic grid shuts down in a metropolis; automated ambulances must navigate chaotic manual intersections safely.",
  "Solar flare wipes digital bank ledgers; island community resurrects cryptographic physical shells for trade transactions."
];

export const SAMPLE_PRODUCT_REQUIREMENTS = [
  {
    title: "EcoTrack: Micro-Carbon Emissions Calculator",
    requirement: "Build a single-screen responsive web app allowing students to estimate daily meal and transit carbon footprint with interactive visual progress rings and reduction suggestions.",
    techStackHint: "React / HTML5 Canvas / Tailwind / LocalStorage"
  },
  {
    title: "PromptForge: Live Token Cost & Efficiency Visualizer",
    requirement: "Build a live prototype that parses prompt token counts, estimates API call latency/cost across 3 AI models, and grades clarity with visual gauges.",
    techStackHint: "React / Charting / Real-time calculation"
  },
  {
    title: "NeuroPulse: Generative Focus Soundboard",
    requirement: "Create a functional web audio synthesizer with frequency sliders (Binaural, Brown Noise, Rain) and a visual pulsing waveform visualizer.",
    techStackHint: "Web Audio API / Canvas / Interactive UI"
  }
];

// Sample images (data SVG URIs so they load instantly without external dependencies)
export const SAMPLE_SCREENSHOTS = {
  biomarine: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900"><rect width="600" height="900" fill="%230b132b"/><rect x="20" y="20" width="560" height="120" rx="12" fill="%231c2541"/><text x="40" y="55" fill="%2364dfdf" font-family="sans-serif" font-size="14" font-weight="bold">Midjourney v6.1 • Mobile Capture</text><text x="40" y="85" fill="%23ffffff" font-family="sans-serif" font-size="12">/imagine prompt: bioluminescent manta ray gliding through</text><text x="40" y="105" fill="%23a0aec0" font-family="sans-serif" font-size="12">hydrothermal vents, cellular solar veins, deep cobalt oceanic light...</text><rect x="20" y="160" width="560" height="680" rx="16" fill="%231e3a8a"/><circle cx="300" cy="500" r="180" fill="%2306b6d4" opacity="0.4"/><path d="M 200,520 Q 300,420 400,520 Q 300,600 200,520 Z" fill="%2338bdf8"/><path d="M 120,530 Q 300,320 480,530 Q 300,560 120,530 Z" fill="%230ea5e9" opacity="0.7"/><circle cx="280" cy="460" r="8" fill="%23fef08a"/><circle cx="320" cy="460" r="8" fill="%23fef08a"/><text x="300" y="810" text-anchor="middle" fill="%2394a3b8" font-family="monospace" font-size="14">PROMPT WARS 2026 • ROUND 01 VERIFIED</text></svg>`,
  vedic: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900"><rect width="600" height="900" fill="%231a0b2e"/><rect x="20" y="20" width="560" height="120" rx="12" fill="%232d124d"/><text x="40" y="55" fill="%23f59e0b" font-family="sans-serif" font-size="14" font-weight="bold">Ideogram 2.0 • Mobile Capture</text><text x="40" y="85" fill="%23ffffff" font-family="sans-serif" font-size="12">A 12th century Indian astronomer atop Jantar Mantar observing</text><text x="40" y="105" fill="%23d8b4fe" font-family="sans-serif" font-size="12">supernova, brass astrolabes, parchment diagrams, starry cosmos...</text><rect x="20" y="160" width="560" height="680" rx="16" fill="%233b0764"/><circle cx="300" cy="450" r="140" fill="%23f59e0b" opacity="0.25"/><polygon points="300,350 330,450 430,450 350,510 380,610 300,550 220,610 250,510 170,450 270,450" fill="%23fbbf24"/><circle cx="300" cy="450" r="30" fill="%237c3aed"/><text x="300" y="810" text-anchor="middle" fill="%23d8b4fe" font-family="monospace" font-size="14">PROMPT WARS 2026 • ROUND 01 VERIFIED</text></svg>`
};

export const INITIAL_PARTICIPANTS: Participant[] = [
  {
    id: 'p-1',
    registrationId: 'PW-2026-081',
    name: 'Aarav Mehta',
    college: 'IIT Bombay (Data Science Dept)',
    email: 'aarav.m@iitb.ac.in',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=face',
    round1Score: 94,
    round2Score: 92,
    round3Score: 96,
    authenticityBonusTotal: 8,
    totalScore: 290,
    rank: 1,
    status: 'champion',
    submissionsCount: 3
  },
  {
    id: 'p-2',
    registrationId: 'PW-2026-042',
    name: 'Diya Sharma',
    college: 'BITS Pilani (AI & Robotics)',
    email: 'diya.s@pilani.bits.edu',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&h=120&fit=crop&crop=face',
    round1Score: 91,
    round2Score: 95,
    round3Score: 89,
    authenticityBonusTotal: 9,
    totalScore: 284,
    rank: 2,
    status: 'qualified_r3',
    submissionsCount: 3
  },
  {
    id: 'p-3',
    registrationId: 'PW-2026-119',
    name: 'Rohan Deshmukh',
    college: 'COEP Tech University (Comp Sci)',
    email: 'rohan.d@coep.ac.in',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=face',
    round1Score: 88,
    round2Score: 89,
    round3Score: 93,
    authenticityBonusTotal: 7,
    totalScore: 277,
    rank: 3,
    status: 'qualified_r3',
    submissionsCount: 3
  },
  {
    id: 'p-4',
    registrationId: 'PW-2026-015',
    name: 'Ananya Iyer',
    college: 'NIT Trichy (CSE)',
    email: 'ananya.iyer@nitt.edu',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop&crop=face',
    round1Score: 85,
    round2Score: 88,
    round3Score: 82,
    authenticityBonusTotal: 6,
    totalScore: 261,
    rank: 4,
    status: 'qualified_r2',
    submissionsCount: 3
  },
  {
    id: 'p-5',
    registrationId: 'PW-2026-067',
    name: 'Kabir Verma',
    college: 'DTU Delhi (Software Eng)',
    email: 'kabir.v@dtu.ac.in',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=face',
    round1Score: 78,
    round2Score: 84,
    round3Score: 0,
    authenticityBonusTotal: 4,
    totalScore: 166,
    rank: 5,
    status: 'qualified_r2',
    submissionsCount: 2
  },
  {
    id: 'p-6',
    registrationId: 'PW-2026-104',
    name: 'Tanvi Kulkarni',
    college: 'VIT Pune (AI & Data Science)',
    email: 'tanvi.k@vit.edu',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&crop=face',
    round1Score: 92,
    round2Score: 0,
    round3Score: 0,
    authenticityBonusTotal: 8,
    totalScore: 100,
    rank: 6,
    status: 'active',
    submissionsCount: 1
  }
];

export const INITIAL_SUBMISSIONS: Submission[] = [
  {
    id: 'sub-101',
    roundId: 1,
    participantId: 'p-1',
    participantName: 'Aarav Mehta',
    college: 'IIT Bombay',
    registrationId: 'PW-2026-081',
    email: 'aarav.m@iitb.ac.in',
    assignedThemeOrChit: 'Bioluminescent Marine Fauna Synthesizing Renewable Solar Energy in 2140',
    promptText: "A macro scientific perspective of a bioluminescent pelagic stingray swimming in midnight Mariana trenches. Its wings are translucent photovoltaic membranes absorbing latent deep-sea infrared heat, glowing with intricate cyan circadian conduits. Soft organic motion blur, underwater caustics reflecting off silica mineral beds, cinematic National Geographic submarine lighting.",
    aiToolUsed: 'Midjourney v6.1',
    screenshotUrl: SAMPLE_SCREENSHOTS.biomarine,
    generatedOutputSummary: 'A high-contrast cyan bioluminescent oceanic stingray with photovoltaic vascular networks.',
    authenticity: {
      authenticityScore: 92,
      isAiGenerated: false,
      aiProbability: 0.08,
      verdict: 'Human Crafted (Self-Made)',
      confidence: 94,
      metrics: {
        burstiness: 84,
        entropyScore: 88,
        formulaicMarkersCount: 0,
        vocabularyDiversity: 91
      },
      detectedMarkers: [],
      flaggedPhrases: [],
      reasoning: "High lexical entropy with natural narrative descriptors ('circadian conduits', 'pelagic stingray'). Absence of formulaic prompt-stuffing tropes (e.g. 'hyperrealistic, 8k, trending on artstation'). Human sentence rhythm demonstrated.",
      improvementTips: ["Strong descriptive vocabulary.", "Maintains direct subject focus."],
      analyzedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString()
    },
    scores: {
      promptQuality: 24,
      outputRelevance: 24,
      creativity: 24,
      technicalExecution: 22,
      authenticityBonus: 8,
      totalScore: 102,
      gradedBy: 'Dr. S. K. Sen (Lead Judge)',
      feedback: 'Outstanding prompt composition. Demonstrates true domain understanding and creative vocabulary without lazy template stuffing.',
      gradedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString()
    },
    status: 'evaluated',
    submittedAt: new Date(Date.now() - 1000 * 60 * 50).toISOString()
  },
  {
    id: 'sub-102',
    roundId: 2,
    participantId: 'p-2',
    participantName: 'Diya Sharma',
    college: 'BITS Pilani',
    registrationId: 'PW-2026-042',
    email: 'diya.s@pilani.bits.edu',
    assignedThemeOrChit: 'Deep-sea submarine loses engine; sonar detects an enormous bio-synthetic whale swimming directly toward the hull.',
    promptText: "Act as an acoustic sensor system aboard DSV Nautilus. Emergency log entry: 04:12 UTC. Sonar ping frequency 42kHz. Transmit a high-stress 4-line Morse-translated incident report describing structural pressure anomalies as the 140-meter bio-synthetic cetacean organism brushes past our starboard ballast tanks.",
    aiToolUsed: 'Claude 3.7 Sonnet',
    generatedOutputSummary: 'Generated realistic acoustic logs with sonar ping decibels, mechanical hull stress meters, and chilling crew telemetry transcripts.',
    authenticity: {
      authenticityScore: 89,
      isAiGenerated: false,
      aiProbability: 0.11,
      verdict: 'Human Crafted (Self-Made)',
      confidence: 91,
      metrics: {
        burstiness: 79,
        entropyScore: 86,
        formulaicMarkersCount: 1,
        vocabularyDiversity: 88
      },
      detectedMarkers: ["Roleplay directive ('Act as')"],
      flaggedPhrases: ["Act as an acoustic sensor"],
      reasoning: "Prompt contains creative constraint engineering tailored tightly to the scenario chit with technical jargon and specific formatting requirements.",
      improvementTips: ["Original phrasing with clear simulation boundaries."],
      analyzedAt: new Date(Date.now() - 1000 * 60 * 25).toISOString()
    },
    scores: {
      promptQuality: 24,
      outputRelevance: 25,
      creativity: 25,
      technicalExecution: 21,
      authenticityBonus: 9,
      totalScore: 104,
      gradedBy: 'Prof. R. Banerjee',
      feedback: 'Exceptional scenario adaptation! Turning a 15-word situation into a simulated cockpit emergency log was brilliant.',
      gradedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString()
    },
    status: 'evaluated',
    submittedAt: new Date(Date.now() - 1000 * 60 * 28).toISOString()
  },
  {
    id: 'sub-103',
    roundId: 3,
    participantId: 'p-1',
    participantName: 'Aarav Mehta',
    college: 'IIT Bombay',
    registrationId: 'PW-2026-081',
    email: 'aarav.m@iitb.ac.in',
    assignedThemeOrChit: 'PromptForge: Live Token Cost & Efficiency Visualizer',
    promptText: "Iterative Prompt Series (3 rounds): [P1]: Scaffold a single-page React app with Tailwind for tracking prompt token pricing across Gemini 2.5, Claude 3.5, and GPT-4o. [P2]: Implement an interactive token estimator that tokenizes words in real-time as the user types and computes cost in micro-cents ($0.00001). [P3]: Add an animated SVG latency gauge and an instant Prompt Optimizer button that highlights filler words.",
    aiToolUsed: 'Cursor & Bolt.new',
    demoUrl: 'https://promptforge-simulator-demo.web.app',
    repoUrl: 'https://github.com/aarav-mehta/promptforge-prototype',
    generatedOutputSummary: 'Fully functional token cost estimator prototype with reactive charts, simulated latency dials, and filler word highlighter.',
    authenticity: {
      authenticityScore: 94,
      isAiGenerated: false,
      aiProbability: 0.06,
      verdict: 'Human Crafted (Self-Made)',
      confidence: 96,
      metrics: {
        burstiness: 91,
        entropyScore: 89,
        formulaicMarkersCount: 0,
        vocabularyDiversity: 92
      },
      detectedMarkers: [],
      flaggedPhrases: [],
      reasoning: "Authentic phased developer prompt flow (P1 Scaffold -> P2 Logic -> P3 Refinement). Shows real iterative developer thought process.",
      improvementTips: ["Superb iterative prompting methodology."],
      analyzedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString()
    },
    scores: {
      promptQuality: 25,
      outputRelevance: 24,
      creativity: 24,
      technicalExecution: 23,
      authenticityBonus: 8,
      totalScore: 104,
      gradedBy: 'Dr. S. K. Sen (Lead Judge)',
      feedback: 'Working digital product delivered within 26 minutes with flawless multi-model token calculations.',
      gradedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString()
    },
    status: 'evaluated',
    submittedAt: new Date(Date.now() - 1000 * 60 * 14).toISOString()
  },
  {
    id: 'sub-104',
    roundId: 1,
    participantId: 'p-5',
    participantName: 'Kabir Verma',
    college: 'DTU Delhi',
    registrationId: 'PW-2026-067',
    email: 'kabir.v@dtu.ac.in',
    assignedThemeOrChit: 'Ancient Vedic Astronomer Calculating Cosmic Planetary Alignments via Brass Sextants',
    promptText: "masterpiece, 8k resolution, highly detailed, photorealistic, cinematic lighting, trending on artstation, unreal engine 5 render of an astronomer looking at the stars, extreme detail, sharp focus, award winning.",
    aiToolUsed: 'Stable Diffusion XL',
    screenshotUrl: SAMPLE_SCREENSHOTS.vedic,
    generatedOutputSummary: 'A generic 3D rendered figure looking through a telescope with heavy bloom effects.',
    authenticity: {
      authenticityScore: 28,
      isAiGenerated: true,
      aiProbability: 0.88,
      verdict: 'Likely AI Generated / Boilerplate',
      confidence: 92,
      metrics: {
        burstiness: 22,
        entropyScore: 31,
        formulaicMarkersCount: 8,
        vocabularyDiversity: 34
      },
      detectedMarkers: [
        "'masterpiece'",
        "'8k resolution'",
        "'highly detailed'",
        "'photorealistic'",
        "'trending on artstation'",
        "'unreal engine 5'",
        "'award winning'"
      ],
      flaggedPhrases: [
        "masterpiece, 8k resolution",
        "trending on artstation",
        "unreal engine 5 render"
      ],
      reasoning: "Extremely high concentration of generic boilerplate prompt-stuffing tags. Little to no organic descriptive language addressing the historical Vedic context. Marked as formulaic prompt template.",
      improvementTips: [
        "Avoid stacking buzzwords like '8k, masterpiece, unreal engine'.",
        "Describe actual visual composition, lighting mechanics, materials, and historical elements in your own words."
      ],
      analyzedAt: new Date(Date.now() - 1000 * 60 * 40).toISOString()
    },
    scores: {
      promptQuality: 12,
      outputRelevance: 16,
      creativity: 11,
      technicalExecution: 15,
      authenticityBonus: 0,
      totalScore: 54,
      gradedBy: 'Prof. R. Banerjee',
      feedback: 'Heavy prompt-stuffing with cliché buzzwords. Output lacked the specific Vedic architectural nuances requested.',
      gradedAt: new Date(Date.now() - 1000 * 60 * 20).toISOString()
    },
    status: 'flagged_ai',
    submittedAt: new Date(Date.now() - 1000 * 60 * 42).toISOString()
  }
];

export const INITIAL_EVENT_STATE: EventState = {
  activeRound: 2,
  timerSecondsRemaining: 480, // 8 minutes left in Round 2
  isTimerRunning: true,
  currentThemeRound1: "Bioluminescent Marine Fauna Synthesizing Renewable Solar Energy in 2140",
  scenarioChitsRound2: SAMPLE_SCENARIO_CHITS,
  productRequirementsRound3: SAMPLE_PRODUCT_REQUIREMENTS,
  announcements: [
    {
      id: 'ann-1',
      time: '10:00 AM',
      message: 'Welcome to PROMPT WARS 2026 — Battle of the Minds! Entry fee verified for all 48 registered candidates.',
      type: 'info'
    },
    {
      id: 'ann-2',
      time: '10:15 AM',
      message: 'Round 01 completed. Screenshots and prompt authenticity verified. 32 participants qualified for Round 02.',
      type: 'info'
    },
    {
      id: 'ann-3',
      time: '10:22 AM',
      message: 'Round 02 Scenario Sprint is LIVE in Computer Lab. Draw your 15-word scenario chit and start prompting!',
      type: 'urgent'
    }
  ],
  isLeaderboardPublished: false,
  publishedRounds: {
    round1: false,
    round2: false,
    round3: false
  },
  isRoundActive: true,
  roundStatuses: {
    round1: true,
    round2: true,
    round3: false
  }
};
