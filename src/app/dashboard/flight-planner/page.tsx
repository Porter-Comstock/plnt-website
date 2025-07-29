// app/dashboard/flight-planner/page.tsx
'use client'

import { ProtectedRoute } from '@/lib/auth/protected-route'
import FlightPlannerInterface from '@/components/flight-planner'

export default function FlightPlannerPage() {
  return (
    <ProtectedRoute>
      <FlightPlannerInterface />
    </ProtectedRoute>
  )
}