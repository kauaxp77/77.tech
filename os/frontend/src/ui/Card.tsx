import type { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`glass rounded-xl p-5 ${className}`}>{children}</div>
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="flex flex-col items-center gap-2 py-12 text-center">
      <p className="text-base font-medium text-foreground">{title}</p>
      <p className="max-w-sm text-sm text-text-secondary">{description}</p>
    </Card>
  )
}

const tones = {
  neutral: 'bg-white/8 text-text-secondary',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-danger/15 text-danger',
} as const

export function Badge({ tone, children }: { tone: keyof typeof tones; children: ReactNode }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  )
}
