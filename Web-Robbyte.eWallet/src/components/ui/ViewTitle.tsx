
export function ViewTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="h3 mb-1">{title}</h1>
      <p className="text-secondary mb-0">{subtitle}</p>
    </div>
  );
}

