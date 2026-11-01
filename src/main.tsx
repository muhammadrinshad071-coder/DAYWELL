import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { LazyMotion, MotionConfig, domAnimation } from 'motion/react'
import '@fontsource-variable/manrope'
import './styles.css'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { ClockProvider, DataProvider, FeedbackProvider, PreferencesProvider } from './state/Providers'
import { PWAProvider } from './state/PWAProvider'

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><LazyMotion features={domAnimation}><MotionConfig reducedMotion="user"><PreferencesProvider><ErrorBoundary><FeedbackProvider><ClockProvider><DataProvider><BrowserRouter><PWAProvider><App /></PWAProvider></BrowserRouter></DataProvider></ClockProvider></FeedbackProvider></ErrorBoundary></PreferencesProvider></MotionConfig></LazyMotion></React.StrictMode>)
