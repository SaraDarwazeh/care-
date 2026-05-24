export interface StoreItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
}

export const STORE_ITEMS: StoreItem[] = [
  {
    id: "prod_1",
    name: "Blood Pressure Monitor",
    description: "Easy-to-use automatic upper arm blood pressure monitor with large LCD display and irregular heartbeat indicator.",
    price: 45.00,
    category: "Monitoring",
    image: "🩺",
  },
  {
    id: "prod_2",
    name: "Digital Thermometer",
    description: "Fast and accurate digital thermometer for oral, rectal, or underarm use. Results in 10 seconds.",
    price: 12.00,
    category: "Monitoring",
    image: "🌡️",
  },
  {
    id: "prod_3",
    name: "Glucometer Kit",
    description: "Complete blood glucose monitoring kit includes meter, 50 test strips, lancets, and carrying case.",
    price: 35.00,
    category: "Monitoring",
    image: "💉",
  },
  {
    id: "prod_4",
    name: "N95 Masks (5-pack)",
    description: "NIOSH-approved N95 respirator masks providing 95% filtration. Protective against airborne particles.",
    price: 18.00,
    category: "Masks & Protection",
    image: "😷",
  },
  {
    id: "prod_5",
    name: "Nitrile Gloves (Box of 100)",
    description: "Powder-free nitrile examination gloves. Latex-free, puncture-resistant, and ambidextrous.",
    price: 22.00,
    category: "Masks & Protection",
    image: "🧤",
  },
  {
    id: "prod_6",
    name: "Walker with Wheels",
    description: "Lightweight rolling walker with ergonomic handles, padded seat, and storage pouch for added convenience.",
    price: 89.00,
    category: "Equipment",
    image: "🦼",
  },
  {
    id: "prod_7",
    name: "Wheelchair Cushion",
    description: "High-density memory foam wheelchair cushion with non-slip base. Helps prevent pressure sores.",
    price: 42.00,
    category: "Elderly Support",
    image: "🛋️",
  },
  {
    id: "prod_8",
    name: "Pill Organizer Weekly",
    description: "7-day pill organizer with AM/PM compartments. Color-coded for each day with easy-open lids.",
    price: 15.00,
    category: "Elderly Support",
    image: "💊",
  },
  {
    id: "prod_9",
    name: "Wound Care Kit",
    description: "Comprehensive sterile wound care kit including gauze, antiseptic, bandages, and medical tape.",
    price: 28.00,
    category: "Recovery",
    image: "🩹",
  },
  {
    id: "prod_10",
    name: "Compression Stockings",
    description: "Medical-grade graduated compression stockings for improved circulation and swelling relief.",
    price: 32.00,
    category: "Recovery",
    image: "🧦",
  },
];
