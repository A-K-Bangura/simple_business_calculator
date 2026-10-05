import { useEffect } from 'react'
import { PlanScreen } from './components/plan/PlanScreen'
import { PlansScreen } from './components/plans/PlansScreen'
import { StorageErrorScreen } from './components/StorageErrorScreen'
import { ToastProvider } from './components/ui/ToastProvider'
import { PlansProvider } from './state/PlansProvider'
import { usePlansData } from './state/plansContext'
import { useRoute } from './state/router'

function Screens() {
  const route = useRoute()
  const { status } = usePlansData()
  const screenKey = route.name === 'plan' ? route.planId : route.name

  // A new screen always starts at the top.
  useEffect(() => window.scrollTo(0, 0), [screenKey])

  if (status === 'loading') return <div aria-busy="true" className="min-h-dvh" />
  if (status === 'error') return <StorageErrorScreen />

  return (
    <main>{route.name === 'plan' ? <PlanScreen key={route.planId} planId={route.planId} /> : <PlansScreen />}</main>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <PlansProvider>
        <Screens />
      </PlansProvider>
    </ToastProvider>
  )
}
