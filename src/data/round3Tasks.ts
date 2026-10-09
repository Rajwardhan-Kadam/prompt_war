export interface Round3Task {
  id: number;
  title: string;
  theme: string;
  category: string;
  problemStatement: string;
  mandatoryFeatures: string[];
}

export const ROUND3_TASKS: Round3Task[] = [
  {
    id: 1,
    title: "Problem Statement 1: Roots & Relations",
    theme: "Interactive genealogy and family heritage",
    category: "Genealogy & Family Heritage",
    problemStatement: "Families often struggle to preserve and share their history, photographs, achievements, and relationships in one organized place. Design and develop an interactive, privacy-conscious family tree website that allows users to explore family connections and learn about each family member.",
    mandatoryFeatures: [
      "Display a visual family tree with multiple generations.",
      "Make each family member clickable to view their photo, name, relationship, biography, and accomplishments.",
      "Include sample family data with at least three generations.",
      "Provide an easy way to navigate between family members and return to the main tree.",
      "Create a password-protected entry screen or demonstrate a functional login flow to protect private family information."
    ]
  },
  {
    id: 2,
    title: "Problem Statement 2: CourtCraft",
    theme: "Sports product showcase and shopping experience",
    category: "E-commerce & Sports Showcase",
    problemStatement: "A new basketball jersey brand needs a professional digital storefront to showcase its products and attract potential customers. Create a modern, visually engaging website that highlights the jersey's design, features, and available options while providing a smooth product-browsing experience.",
    mandatoryFeatures: [
      "Create a striking homepage featuring the basketball jersey as the main product.",
      "Display product images or mockups, price, material, and key features.",
      "Allow users to select jersey sizes and available colors.",
      "Include a functional add-to-cart interaction with a visible cart count.",
      "Provide a product details section and a clear checkout or order-summary preview."
    ]
  }
];
