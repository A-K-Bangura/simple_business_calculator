import { CircleAlert } from 'lucide-react'
import { usePlansActions, usePlansData } from '../state/plansContext'
import { Button } from './ui/Button'
import { EmptyState } from './ui/EmptyState'

/** Shown instead of the app when saved plans can't be opened. Nothing is deleted without being asked. */
export function StorageErrorScreen() {
  const { error } = usePlansData()
  const { retryLoad, startFresh } = usePlansActions()
  const canStartFresh = error?.code === 'corrupt'

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-10 sm:px-6">
      <EmptyState
        headingLevel={1}
        icon={<CircleAlert />}
        title="We couldn’t open your saved plans"
        description={error?.message ?? 'Something went wrong while reading what was saved on this device.'}
      >
        <p className="max-w-sm text-sm text-stone-600">
          Nothing has been deleted or changed.
          {canStartFresh && ' If trying again doesn’t help, you can start fresh. A copy of the unreadable data is kept in your browser.'}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={retryLoad}>Try again</Button>
          {canStartFresh && (
            <Button variant="secondary" onClick={() => void startFresh()}>
              Start fresh
            </Button>
          )}
        </div>
      </EmptyState>
    </div>
  )
}
