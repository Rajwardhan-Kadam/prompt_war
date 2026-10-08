export interface Round2Task {
  id: number;
  title: string;
  scenario: string;
  category?: string;
}

export const ROUND2_TASKS: Round2Task[] = [
  {
    id: 1,
    title: "Scenario 01: Student Time Crisis",
    scenario: "A college student has poor time management and repeatedly misses deadlines despite having a clear study schedule.",
    category: "Academic & Productivity"
  },
  {
    id: 2,
    title: "Scenario 02: Delivery Delay Resolution",
    scenario: "A small business receives many customer complaints about delayed deliveries and wants to improve customer satisfaction.",
    category: "Business Operations"
  },
  {
    id: 3,
    title: "Scenario 03: Soil Regeneration Strategy",
    scenario: "A farmer notices declining crop production and wants practical, affordable methods to improve soil quality.",
    category: "Agriculture & Sustainability"
  },
  {
    id: 4,
    title: "Scenario 04: Campus Event Turnaround",
    scenario: "A college event has low student participation despite extensive promotion through posters and social media.",
    category: "Marketing & Engagement"
  },
  {
    id: 5,
    title: "Scenario 05: Startup Marketing Revival",
    scenario: "A startup has a good product but struggles to attract customers because its marketing strategy is ineffective.",
    category: "Growth & Strategy"
  },
  {
    id: 6,
    title: "Scenario 06: AI Classroom Demystification",
    scenario: "A teacher wants to explain artificial intelligence to beginners using simple real-life examples and interactive activities.",
    category: "Education & Pedagogy"
  },
  {
    id: 7,
    title: "Scenario 07: Family Budget Optimization",
    scenario: "A family wants to reduce monthly expenses without significantly affecting their lifestyle or essential needs.",
    category: "Personal Finance"
  },
  {
    id: 8,
    title: "Scenario 08: Tourist Eco-Sanitation",
    scenario: "A local tourist destination receives visitors but lacks proper waste management, causing environmental and cleanliness problems.",
    category: "Civic & Environment"
  },
  {
    id: 9,
    title: "Scenario 09: Corporate Wellness Habits",
    scenario: "A company wants employees to adopt healthier work habits while maintaining productivity and meeting business targets.",
    category: "Workplace & Health"
  },
  {
    id: 10,
    title: "Scenario 10: Fast Consensus Resolution",
    scenario: "A student team has conflicting ideas for a project and must quickly choose the most feasible solution.",
    category: "Teamwork & Decision Making"
  }
];
