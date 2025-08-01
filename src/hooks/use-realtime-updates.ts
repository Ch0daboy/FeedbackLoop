import { useEffect, useState, useRef } from 'react'

interface RealtimeUpdate {
  type: 'connected' | 'heartbeat' | 'update' | 'status_change' | 'analysis_complete' | 'implementation_progress'
  feedbackId?: string
  timestamp: string
  update?: any
  status?: string
  details?: any
  analysis?: any
  step?: string
  progress?: number
}

interface UseRealtimeUpdatesOptions {
  feedbackId: string
  onStatusChange?: (status: string, details?: any) => void
  onAnalysisComplete?: (analysis: any) => void
  onImplementationProgress?: (step: string, progress: number) => void
  onUpdate?: (update: any) => void
}

export function useRealtimeUpdates({
  feedbackId,
  onStatusChange,
  onAnalysisComplete,
  onImplementationProgress,
  onUpdate
}: UseRealtimeUpdatesOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<RealtimeUpdate | null>(null)
  const [error, setError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  const connect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    try {
      const eventSource = new EventSource(`/api/events?feedbackId=${feedbackId}`)
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        setIsConnected(true)
        setError(null)
        reconnectAttempts.current = 0
        console.log('SSE connection opened for feedback:', feedbackId)
      }

      eventSource.onmessage = (event) => {
        try {
          const data: RealtimeUpdate = JSON.parse(event.data)
          setLastUpdate(data)

          switch (data.type) {
            case 'connected':
              console.log('SSE connected for feedback:', data.feedbackId)
              break

            case 'heartbeat':
              // Just keep the connection alive
              break

            case 'update':
              if (data.update) {
                onUpdate?.(data.update)
                
                // Handle specific update types
                if (data.update.type === 'status_change') {
                  onStatusChange?.(data.update.status, data.update.details)
                } else if (data.update.type === 'analysis_complete') {
                  onAnalysisComplete?.(data.update.analysis)
                } else if (data.update.type === 'implementation_progress') {
                  onImplementationProgress?.(data.update.step, data.update.progress)
                }
              }
              break

            default:
              console.log('Unknown SSE message type:', data.type)
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error)
        }
      }

      eventSource.onerror = (event) => {
        console.error('SSE error:', event)
        setIsConnected(false)
        
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
          setError(`Connection lost. Reconnecting in ${delay / 1000}s...`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++
            connect()
          }, delay)
        } else {
          setError('Connection failed. Please refresh the page.')
        }
      }

    } catch (error) {
      console.error('Error creating SSE connection:', error)
      setError('Failed to establish real-time connection')
    }
  }

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    setIsConnected(false)
  }

  const reconnect = () => {
    disconnect()
    reconnectAttempts.current = 0
    connect()
  }

  useEffect(() => {
    if (feedbackId) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [feedbackId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [])

  return {
    isConnected,
    lastUpdate,
    error,
    reconnect,
    disconnect
  }
}

// Hook for feedback status updates specifically
export function useFeedbackStatus(feedbackId: string) {
  const [status, setStatus] = useState<string>('')
  const [progress, setProgress] = useState<number>(0)
  const [currentStep, setCurrentStep] = useState<string>('')
  const [analysis, setAnalysis] = useState<any>(null)

  const { isConnected, error, reconnect } = useRealtimeUpdates({
    feedbackId,
    onStatusChange: (newStatus, details) => {
      setStatus(newStatus)
      if (details?.progress !== undefined) {
        setProgress(details.progress)
      }
    },
    onAnalysisComplete: (analysisData) => {
      setAnalysis(analysisData)
      setStatus('ANALYZED')
    },
    onImplementationProgress: (step, progressValue) => {
      setCurrentStep(step)
      setProgress(progressValue)
    }
  })

  return {
    status,
    progress,
    currentStep,
    analysis,
    isConnected,
    error,
    reconnect
  }
}

// Hook for real-time feedback list updates
export function useFeedbackListUpdates() {
  const [updates, setUpdates] = useState<any[]>([])
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)

  // This would connect to a general updates stream
  // For now, we'll just track individual feedback updates
  const addUpdate = (update: any) => {
    setUpdates(prev => [update, ...prev.slice(0, 9)]) // Keep last 10 updates
    setLastUpdateTime(new Date())
  }

  return {
    updates,
    lastUpdateTime,
    addUpdate
  }
}
