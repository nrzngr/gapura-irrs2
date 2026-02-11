import './embed.css';

export const metadata = {
  title: 'Gapura IRRS - Dashboard Detail',
  description: 'Interactive report detail view'
};

export default function EmbedLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="embed-body">
      <main className="embed-container">
        {children}
      </main>
    </div>
  );
}
