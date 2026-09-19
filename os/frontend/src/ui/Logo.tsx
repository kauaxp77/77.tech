/** "77" branco e "xp" em gradiente, como no cabeçalho do site. */
export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const text = { sm: 'text-lg', md: 'text-2xl', lg: 'text-3xl' }[size]
  return (
    <span className={`font-bold tracking-tight ${text}`}>
      <span className="text-foreground">77</span>
      <span className="text-gradient">xp</span>
    </span>
  )
}
