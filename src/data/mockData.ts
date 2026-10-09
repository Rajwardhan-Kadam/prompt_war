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

export const INITIAL_PARTICIPANTS: Participant[] = [];

export const INITIAL_SUBMISSIONS: Submission[] = [];

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
