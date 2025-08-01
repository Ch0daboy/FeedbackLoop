'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { StatusIndicator, ProgressIndicator } from '@/components/realtime/status-indicator'
import { useRealtimeUpdates } from '@/hooks/use-realtime-updates'

interface FeedbackDetails {
  id: string
  title: string
  description: string
  email?: string
  category?: string
  priority?: string
  sentiment?: string
  status: string
  createdAt: string
  updatedAt: string
  user?: {
    name: string
    email: string
  }
  project: {
    id: string
    name: string
  }
  analysis?: {
    id: string
    extractedCategory?: string
    extractedPriority?: string
    extractedSentiment?: string
    isImplementable: boolean
    implementationSuggestion?: string
    createdAt: string
  }
  implementation?: {
    id: string
    githubBranch: string
    status: string
    githubPrUrl?: string
    createdAt: string
    updatedAt: string
  }
}

export default function FeedbackDetailPage() {
  const params = useParams()
  const feedbackId = params.id as string
  
  const [feedback, setFeedback] = useState<FeedbackDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [analyzing, setAnalyzing] = useState(false)
  const [implementing, setImplementing] = useState(false)

  // Set up real-time updates
  useRealtimeUpdates({
    feedbackId,
    onStatusChange: (status) => {
      if (feedback) {
        setFeedback(prev => prev ? { ...prev, status } : null)
      }
    },
    onAnalysisComplete: (analysis) => {
      fetchFeedbackDetails() // Refresh to get full analysis data
    },
    onUpdate: (update) => {
      // Handle other types of updates
      console.log('Received update:', update)
    }
  })

  useEffect(() => {
    if (feedbackId) {
      fetchFeedbackDetails()
    }
  }, [feedbackId])

  const fetchFeedbackDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/feedback/${feedbackId}`)
      
      if (!response.ok) {
        throw new Error('Feedback not found')
      }
      
      const data = await response.json()
      setFeedback(data.feedback)
    } catch (error) {
      console.error('Error fetching feedback:', error)
      setError('Failed to load feedback details')
    } finally {
      setLoading(false)
    }
  }

  const triggerAnalysis = async () => {
    try {
      setAnalyzing(true)
      const response = await fetch(`/api/feedback/${feedbackId}/analyze`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to trigger analysis')
      }

      const result = await response.json()
      alert('Analysis completed successfully!')
      fetchFeedbackDetails() // Refresh data
    } catch (error) {
      console.error('Error triggering analysis:', error)
      alert('Failed to trigger analysis')
    } finally {
      setAnalyzing(false)
    }
  }

  const triggerImplementation = async () => {
    try {
      setImplementing(true)
      
      // For demo purposes, we'll use a placeholder access token
      const accessToken = prompt('Please enter your GitHub access token:')
      if (!accessToken) {
        setImplementing(false)
        return
      }

      const response = await fetch('/api/implementation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          feedbackId,
          accessToken
        })
      })

      if (!response.ok) {
        throw new Error('Failed to trigger implementation')
      }

      const result = await response.json()
      alert('Implementation started successfully!')
      fetchFeedbackDetails() // Refresh data
    } catch (error) {
      console.error('Error triggering implementation:', error)
      alert('Failed to trigger implementation')
    } finally {
      setImplementing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading feedback details...</p>
        </div>
      </div>
    )
  }

  if (error || !feedback) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-md p-6 max-w-md">
            <h3 className="text-lg font-medium text-red-900 mb-2">Error</h3>
            <p className="text-red-700">{error || 'Feedback not found'}</p>
            <Link
              href="/dashboard"
              className="mt-4 inline-block px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IMPLEMENTED': return 'bg-green-100 text-green-800'
      case 'IMPLEMENTING': return 'bg-blue-100 text-blue-800'
      case 'ANALYZED': return 'bg-yellow-100 text-yellow-800'
      case 'ANALYZING': return 'bg-purple-100 text-purple-800'
      case 'PENDING': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-100 text-red-800'
      case 'HIGH': return 'bg-orange-100 text-orange-800'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800'
      case 'LOW': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Feedback Details</h1>
                <p className="text-gray-600">Project: {feedback.project.name}</p>
              </div>
            </div>
            <div className="flex space-x-3">
              {feedback.status === 'PENDING' && (
                <button
                  onClick={triggerAnalysis}
                  disabled={analyzing}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {analyzing ? 'Analyzing...' : 'Analyze'}
                </button>
              )}
              {feedback.status === 'ANALYZED' && feedback.analysis?.isImplementable && (
                <button
                  onClick={triggerImplementation}
                  disabled={implementing}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {implementing ? 'Implementing...' : 'Implement'}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Feedback Details */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">{feedback.title}</h2>
                <div className="flex space-x-2">
                  <StatusIndicator
                    feedbackId={feedback.id}
                    initialStatus={feedback.status}
                    showProgress={true}
                  />
                  {feedback.priority && (
                    <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(feedback.priority)}`}>
                      {feedback.priority}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{feedback.description}</p>
              </div>

              {/* Progress Indicator for active processes */}
              {(feedback.status === 'ANALYZING' || feedback.status === 'IMPLEMENTING') && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <ProgressIndicator feedbackId={feedback.id} />
                </div>
              )}

              <div className="mt-6 flex items-center justify-between text-sm text-gray-500">
                <div>
                  {feedback.user ? (
                    <span>Submitted by {feedback.user.name}</span>
                  ) : feedback.email ? (
                    <span>Submitted by {feedback.email}</span>
                  ) : (
                    <span>Anonymous submission</span>
                  )}
                </div>
                <div>
                  {new Date(feedback.createdAt).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Analysis Results */}
            {feedback.analysis && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">AI Analysis</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Category</label>
                    <p className="mt-1 text-sm text-gray-900">{feedback.analysis.extractedCategory || 'Not categorized'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Priority</label>
                    <p className="mt-1 text-sm text-gray-900">{feedback.analysis.extractedPriority || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Sentiment</label>
                    <p className="mt-1 text-sm text-gray-900">{feedback.analysis.extractedSentiment || 'Not analyzed'}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-500">Implementable</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {feedback.analysis.isImplementable ? 'Yes' : 'No'}
                  </p>
                </div>

                {feedback.analysis.implementationSuggestion && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Implementation Suggestion</label>
                    <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                      {feedback.analysis.implementationSuggestion}
                    </p>
                  </div>
                )}

                <div className="mt-4 text-xs text-gray-500">
                  Analyzed on {new Date(feedback.analysis.createdAt).toLocaleString()}
                </div>
              </div>
            )}

            {/* Implementation Details */}
            {feedback.implementation && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Implementation</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Status</label>
                    <span className={`mt-1 inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(feedback.implementation.status)}`}>
                      {feedback.implementation.status}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500">GitHub Branch</label>
                    <p className="mt-1 text-sm text-gray-900 font-mono">{feedback.implementation.githubBranch}</p>
                  </div>

                  {feedback.implementation.githubPrUrl && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Pull Request</label>
                      <a
                        href={feedback.implementation.githubPrUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 text-sm text-blue-600 hover:text-blue-500"
                      >
                        View on GitHub →
                      </a>
                    </div>
                  )}

                  <div className="text-xs text-gray-500">
                    Started on {new Date(feedback.implementation.createdAt).toLocaleString()}
                    {feedback.implementation.updatedAt !== feedback.implementation.createdAt && (
                      <span> • Updated {new Date(feedback.implementation.updatedAt).toLocaleString()}</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link
                  href={`/feedback/${feedback.id}/edit`}
                  className="block w-full text-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Edit Feedback
                </Link>
                <button
                  onClick={() => window.location.reload()}
                  className="block w-full text-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Refresh Status
                </button>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Timeline</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full"></div>
                  <div className="text-sm">
                    <p className="text-gray-900">Feedback submitted</p>
                    <p className="text-gray-500">{new Date(feedback.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                
                {feedback.analysis && (
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-2 h-2 bg-yellow-600 rounded-full"></div>
                    <div className="text-sm">
                      <p className="text-gray-900">AI analysis completed</p>
                      <p className="text-gray-500">{new Date(feedback.analysis.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                )}

                {feedback.implementation && (
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-2 h-2 bg-green-600 rounded-full"></div>
                    <div className="text-sm">
                      <p className="text-gray-900">Implementation started</p>
                      <p className="text-gray-500">{new Date(feedback.implementation.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
