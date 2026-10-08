export interface Round1Task {
  id: number;
  category: string;
  title: string;
  brief: string;
}

export const ROUND1_TASKS: Round1Task[] = [
  // Category A: Futuristic & Sci-Fi
  {
    id: 1,
    category: "Futuristic & Sci-Fi",
    title: "1. Cyberpunk Neon Night School",
    brief: "Create a high-density, nighttime classroom illuminated by pink and cyan neon strip lights, featuring transparent digital slate boards on each desk."
  },
  {
    id: 2,
    category: "Futuristic & Sci-Fi",
    title: "2. Orbital Space Station Academy",
    brief: "Design a zero-gravity classroom inside an orbital habitat, looking out through a panoramic window at the curved horizon of Earth."
  },
  {
    id: 3,
    category: "Futuristic & Sci-Fi",
    title: "3. Robot Teacher & Human Students",
    brief: "Show a friendly, rounded retro-futuristic humanoid robot instructor writing complex math formulas on an interactive digital board."
  },
  {
    id: 4,
    category: "Futuristic & Sci-Fi",
    title: "4. Post-Apocalyptic Bunker Study",
    brief: "Depict an underground survival bunker converted into a makeshift schoolroom, illuminated by warm hanging tungsten cage bulbs."
  },
  {
    id: 5,
    category: "Futuristic & Sci-Fi",
    title: "5. Holographic Solar System Lecture",
    brief: "Illustrate a dark astronomy lecture hall where a glowing, scaled holographic model of Saturn and its rings spins above the floor."
  },
  {
    id: 6,
    category: "Futuristic & Sci-Fi",
    title: "6. Martian Colony Kindergarten",
    brief: "Create a colorful kindergarten inside an enclosed pressurized dome on Mars, with red dusty Martian hills visible outside the reinforced glass."
  },

  // Category B: Fantasy & Magical
  {
    id: 7,
    category: "Fantasy & Magical",
    title: "7. Ancient Wizard Library Class",
    brief: "Design an arcane wizarding academy classroom with towering floor-to-ceiling bookshelves and enchanted floating books."
  },
  {
    id: 8,
    category: "Fantasy & Magical",
    title: "8. Forest Glade Open-Air School",
    brief: "Depict an outdoor fantasy classroom set inside a clearing of an ancient enchanted forest, with desks made of polished tree trunks."
  },
  {
    id: 9,
    category: "Fantasy & Magical",
    title: "9. Clockwork Steampunk Lecture Hall",
    brief: "Generate an engineering classroom driven by steampunk technology, featuring giant exposed brass gears and steam valves on the walls."
  },
  {
    id: 10,
    category: "Fantasy & Magical",
    title: "10. Crystal Cavern Classroom",
    brief: "Show an underground subterranean classroom lit entirely by massive glowing amethyst and quartz crystals protruding from rock walls."
  },
  {
    id: 11,
    category: "Fantasy & Magical",
    title: "11. Floating Sky Island School",
    brief: "Create an airy classical classroom perched on a floating island high above the clouds, with open stone archways instead of windows."
  },
  {
    id: 12,
    category: "Fantasy & Magical",
    title: "12. Treehouse Canopy Class",
    brief: "Illustrate a wooden treehouse classroom built high up in the canopy of giant redwood trees, connected by rope suspension bridges."
  },

  // Category C: Nature & Biophilic
  {
    id: 13,
    category: "Nature & Biophilic",
    title: "13. Greenhouse Botanical Lab",
    brief: "Design a bright glass greenhouse classroom overflowing with exotic tropical ferns, hanging terrariums, and wooden botany workbenches."
  },
  {
    id: 14,
    category: "Nature & Biophilic",
    title: "14. Deep-Sea Submarine Classroom",
    brief: "Depict a classroom inside an underwater research vessel with thick circular portholes looking out into a bioluminescent coral reef."
  },
  {
    id: 15,
    category: "Nature & Biophilic",
    title: "15. Desert Oasis Open Pavilion",
    brief: "Create a shaded desert classroom pavilion with sand-colored stone arches, hand-woven floor carpets, and towering date palms outside."
  },
  {
    id: 16,
    category: "Nature & Biophilic",
    title: "16. Snowy Alpine Cabin School",
    brief: "Generate a cozy wooden log cabin classroom with a stone fireplace crackling in the corner and snow-covered pine trees outside large glass panes."
  },
  {
    id: 17,
    category: "Nature & Biophilic",
    title: "17. Bamboo Grove Zen Classroom",
    brief: "Design a serene, minimalist outdoor classroom surrounded by a dense green bamboo grove, featuring tatami mats and low wooden study tables."
  },
  {
    id: 18,
    category: "Nature & Biophilic",
    title: "18. Rain-Drenched Monsoon Classroom",
    brief: "Show an Indian government school classroom during a heavy monsoon shower, with rain streaming down large open iron-grille windows onto wet verandahs."
  },

  // Category D: Art Styles & Creative Mediums
  {
    id: 19,
    category: "Art Styles & Mediums",
    title: "19. Studio Ghibli Watercolor Classroom",
    brief: "Create a nostalgic, hand-painted anime schoolroom in the warm gouache-and-watercolor style of classic Japanese animation."
  },
  {
    id: 20,
    category: "Art Styles & Mediums",
    title: "20. Claymation Miniature Diorama",
    brief: "Depict an isometric miniature classroom made completely out of colorful modeling clay, complete with thumbprint textures and tiny clay props."
  },
  {
    id: 21,
    category: "Art Styles & Mediums",
    title: "21. Isometric Low-Poly Voxel Classroom",
    brief: "Design an isometric voxel-art/3D pixel diorama of a modern computer lab and classroom with clean geometric blocks."
  },
  {
    id: 22,
    category: "Art Styles & Mediums",
    title: "22. Vintage 1920s Sepia Chalkboard Class",
    brief: "Generate an authentic historical 1920s classroom photographed on vintage black-and-white grain film with authentic antique desks."
  },
  {
    id: 23,
    category: "Art Styles & Mediums",
    title: "23. Pop-Art Comic Book Classroom",
    brief: "Create an energetic classroom scene rendered in vintage American comic book style, featuring bold black outlines and halftone Ben-Day dots."
  },
  {
    id: 24,
    category: "Art Styles & Mediums",
    title: "24. Paper Cutout Craft Art Room",
    brief: "Depict a layered papercraft art classroom where the walls, desks, chalkboards, and outdoor trees are constructed from textured layered craft paper."
  },

  // Category E: Unique Thematic Concepts
  {
    id: 25,
    category: "Unique Concepts",
    title: "25. Candy Land Confectionery Classroom",
    brief: "Design a whimsical fantasy classroom built entirely from sweets, featuring wafer benches, candy cane pillars, and chocolate desks."
  },
  {
    id: 26,
    category: "Unique Concepts",
    title: "26. Architectural Blueprint Draft Room",
    brief: "Illustrate a modern architecture drafting studio covered in white grid lines, architectural scale models, and glowing cyan blueprints on white tables."
  },
  {
    id: 27,
    category: "Unique Concepts",
    title: "27. High-End Silicon Valley AI Lab",
    brief: "Generate an ultra-modern tech academy classroom with curved dual-screen curved setups, glass markerboards, and acoustic wooden wall slats."
  },
  {
    id: 28,
    category: "Unique Concepts",
    title: "28. Golden Hour Nostalgic Village School",
    brief: "Depict a calm rural village schoolroom lit by deep amber sunset light pouring through tall arched wooden doors onto dusty floor tiles."
  },
  {
    id: 29,
    category: "Unique Concepts",
    title: "29. Microscopic Biology Cell Classroom",
    brief: "Show a surreal science classroom built inside a giant living biological cell, with glowing mitochondria and semi-transparent cellular walls."
  },
  {
    id: 30,
    category: "Unique Concepts",
    title: "30. Retro 1980s Arcade Computer Lab",
    brief: "Create an authentic 1980s school computer room filled with bulky beige CRT monitors, floppy disk racks, and retro synthwave carpeting."
  }
];
