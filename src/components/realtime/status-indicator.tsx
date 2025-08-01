'use client'

import { useFeedbackStatus } from '@/hooks/use-realtime-updates'

interface StatusIndicatorProps {
  feedbackId: string
  initialStatus?: string
  showProgress?: boolean
  className?: string
}

export function StatusIndicator({ 
  feedbackId, 
  initialStatus = '', 
  showProgress = true,
  className = ''
}: StatusIndicatorProps) {
  const { 
    status, 
    progress, 
    currentStep, 
    isConnected, 
    error, 
    reconnect 
  } = useFeedbackStatus(feedbackId)

  const currentStatus = status || initialStatus
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IMPLEMENTED': return 'text-green-600 bg-green-100'
      case 'IMPLEMENTING': return 'text-blue-600 bg-blue-100'
      case 'ANALYZED': return 'text-yellow-600 bg-yellow-100'
      case 'ANALYZING': return 'text-purple-600 bg-purple-100'
      case 'PENDING': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'IMPLEMENTED':
        return (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'IMPLEMENTING':
        return (
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )
      case 'ANALYZED':
        return (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        )
      case 'ANALYZING':
        return (
          <svg className="h-4 w-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        )
      case 'PENDING':
        return (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      default:
        return (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  return (
    <div className={`inline-flex items-center space-x-2 ${className}`}>
      {/* Connection Status */}
      <div className="flex items-center space-x-1">
        <div className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-400' : 'bg-red-400'
        }`} />
        {!isConnected && error && (
          <button
            onClick={reconnect}
            className="text-xs text-blue-600 hover:text-blue-500"
            title="Reconnect to real-time updates"
          >
            Reconnect
          </button>
        )}
      </div>

      {/* Status Badge */}
      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(currentStatus)}`}>
        {getStatusIcon(currentStatus)}
        <span className="ml-1">{currentStatus}</span>
      </div>

      {/* Progress Bar */}
      {showProgress && (currentStatus === 'ANALYZING' || currentStatus === 'IMPLEMENTING') && (
        <div className="flex items-center space-x-2">
          <div className="w-20 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">{progress}%</span>
        </div>
      )}

      {/* Current Step */}
      {currentStep && (
        <span className="text-xs text-gray-500">
          {currentStep}
        </span>
      )}

      {/* Error Message */}
      {error && !isConnected && (
        <span className="text-xs text-red-500" title={error}>
          ⚠️
        </span>
      )}
    </div>
  )
}

// Simplified version for lists
export function StatusBadge({ 
  feedbackId, 
  initialStatus = '',
  className = ''
}: Omit<StatusIndicatorProps, 'showProgress'>) {
  return (
    <StatusIndicator 
      feedbackId={feedbackId}
      initialStatus={initialStatus}
      showProgress={false}
      className={className}
    />
  )
}

// Progress bar component for detailed views
export function ProgressIndicator({ feedbackId }: { feedbackId: string }) {
  const { progress, currentStep, status } = useFeedbackStatus(feedbackId)

  if (status !== 'ANALYZING' && status !== 'IMPLEMENTING') {
    return null
  }

  return (
    <div className="w-full">
      <div className="flex justify-between text-sm text-gray-600 mb-1">
        <span>{currentStep || 'Processing...'}</span>
        <span>{progress}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
