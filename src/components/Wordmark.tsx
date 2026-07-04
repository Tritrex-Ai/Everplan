/** The Everplan logotype: an italic serif mark, used on the auth gate and
 * the dashboard header so the brand reads consistently across both the
 * editorial (photography) surfaces and the flat functional ones. */
export function Wordmark({
  size = "md",
  tone = "ink",
  className = "",
}: {
  size?: "md" | "lg";
  tone?: "ink" | "light";
  className?: string;
}) {
  const sizes = { md: "text-[22px]", lg: "text-[30px] sm:text-[36px]" };
  const tones = { ink: "text-ink", light: "text-white" };
  return (
    <span
      className={`font-serif italic tracking-tight ${sizes[size]} ${tones[tone]} ${className}`}
    >
      Everplan
    </span>
  );
}
