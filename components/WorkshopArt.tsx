/** Stand-in artwork for a workshop without an image: its type and title on the brand gradient. */
export function WorkshopArt({ category, title }: { category: string; title: string }) {
  return (
    <div className="workshop-art" role="img" aria-label={title}>
      <span className="workshop-art-category">{category}</span>
      <span className="workshop-art-title">{title}</span>
    </div>
  );
}
