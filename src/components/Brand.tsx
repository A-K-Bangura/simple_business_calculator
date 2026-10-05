import { Calculator } from 'lucide-react'
import { plansHref } from '../state/router'

export function Brand() {
  return (
    <a
      href={plansHref}
      className="-ml-1.5 inline-flex min-h-11 items-center gap-2.5 rounded-xl px-1.5 font-semibold tracking-tight text-stone-900"
    >
      <span aria-hidden className="grid size-8 place-items-center rounded-xl bg-accent-700 text-white">
        <Calculator className="size-4.5" />
      </span>
      Startup Calculator
    </a>
  )
}
