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
    name: "Sterile Wound Dressing Kit",
    description: "Complete sterile kit for home wound care and dressing changes.",
    price: 15.00,
    category: "Wound Care",
    image: "🩹",
  },
  {
    id: "prod_2",
    name: "Digital Blood Pressure Monitor",
    description: "Easy-to-use automatic upper arm blood pressure monitor.",
    price: 45.00,
    category: "Equipment",
    image: "🩺",
  },
  {
    id: "prod_3",
    name: "Compression Socks (Pair)",
    description: "Medical-grade compression socks for improved circulation.",
    price: 22.50,
    category: "Apparel",
    image: "🧦",
  },
  {
    id: "prod_4",
    name: "First Aid Basics Kit",
    description: "Essential first aid supplies for common minor injuries.",
    price: 30.00,
    category: "Kits",
    image: "⚕️",
  }
];
