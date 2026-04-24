export default function LoadingScreen({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
        {text}
      </p>
    </div>
  );
}
