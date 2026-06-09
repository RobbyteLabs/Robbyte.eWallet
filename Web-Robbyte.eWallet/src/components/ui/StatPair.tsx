
export function StatPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="d-flex justify-content-between gap-3 border-bottom py-2">
      <span className="text-secondary">{label}</span>
      <strong className="text-end">{value}</strong>
    </div>
  );
}

