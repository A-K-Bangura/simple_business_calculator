import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  children?: ReactNode
  headingLevel?: 1 | 2
}

export function EmptyState({ icon, title, description, children, headingLevel = 2 }: EmptyStateProps) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2'
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-2 py-10 text-center">
      <div aria-hidden className="grid size-16 place-items-center rounded-3xl bg-accent-100 text-accent-700 [&>svg]:size-8">
        {icon}
      </div>
      <Heading className="mt-6 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">{title}</Heading>
      <p className="mt-2 text-pretty text-base text-stone-600">{description}</p>
      {children && <div className="mt-6 flex w-full flex-col items-center gap-3">{children}</div>}
    </div>
  )
}
