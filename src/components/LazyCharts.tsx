import { lazy, Suspense, type ComponentProps } from 'react'
import type * as Charts from './charts'

const Money = lazy(() => import('./charts').then(module => ({ default: module.MoneyChart })))
const Category = lazy(() => import('./charts').then(module => ({ default: module.CategoryChart })))
const Wellness = lazy(() => import('./charts').then(module => ({ default: module.WellnessChart })))
const fallback = <div className="skeleton skeleton-chart" />
export function MoneyChart(props: ComponentProps<typeof Charts.MoneyChart>) { return <Suspense fallback={fallback}><Money {...props} /></Suspense> }
export function CategoryChart(props: ComponentProps<typeof Charts.CategoryChart>) { return <Suspense fallback={fallback}><Category {...props} /></Suspense> }
export function WellnessChart(props: ComponentProps<typeof Charts.WellnessChart>) { return <Suspense fallback={fallback}><Wellness {...props} /></Suspense> }
