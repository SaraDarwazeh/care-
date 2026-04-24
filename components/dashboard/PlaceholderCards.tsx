import Card from "@/components/ui/Card";

const placeholders = [
  {
    title: "Appointments",
    text: "Future booking management will live here.",
  },
  {
    title: "Medical Records",
    text: "Secure health records section placeholder.",
  },
  {
    title: "Messages",
    text: "Patient-care team chat features can be added here.",
  },
];

export default function PlaceholderCards() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {placeholders.map((item) => (
        <Card key={item.title} title={item.title} description={item.text}>
          <div className="rounded-xl bg-sky-50 p-3 text-xs text-slate-600">
            Placeholder block
          </div>
        </Card>
      ))}
    </div>
  );
}
