'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { FeedbackForm } from '@/components/forms/feedback-form'

export default function FeedbackPage() {
  const searchParams = useSearchParams()
  const [projectId, setProjectId] = useState<string>('')
  const [projectName, setProjectName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const projectIdParam = searchParams.get('projectId')
    
    if (!projectIdParam) {
      setError('Project ID is required')
      setLoading(false)
      return
    }

    setProjectId(projectIdParam)
    
    // Fetch project details
    fetchProjectDetails(projectIdParam)
  }, [searchParams])

  const fetchProjectDetails = async (id: string) => {
    try {
      const response = await fetch(`/api/projects/${id}`)
      if (!response.ok) {
        throw new Error('Project not found')
      }
      
      const project = await response.json()
      setProjectName(project.name)
    } catch (error) {
      console.error('Error fetching project:', error)
      setError('Failed to load project details')
    } finally {
      setLoading(false)
    }
  }

  const handleFeedbackSuccess = (feedback: any) => {
    console.log('Feedback submitted successfully:', feedback)
    // Could redirect to a success page or show additional information
  }

  const handleFeedbackError = (error: string) => {
    console.error('Feedback submission error:', error)
    // Error is already handled in the form component
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-md p-6 max-w-md">
            <svg className="h-12 w-12 text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 className="text-lg font-medium text-red-900 mb-2">Error</h3>
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => window.history.back()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Share Your Feedback
          </h1>
          {projectName && (
            <p className="text-lg text-gray-600">
              for <span className="font-semibold text-blue-600">{projectName}</span>
            </p>
          )}
          <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
            Your feedback helps us improve. Whether it's a bug report, feature request, 
            or general suggestion, we value your input and will analyze it using AI 
            to potentially implement improvements automatically.
          </p>
        </div>

        {/* Feedback Form */}
        <FeedbackForm
          projectId={projectId}
          onSuccess={handleFeedbackSuccess}
          onError={handleFeedbackError}
        />

        {/* Additional Information */}
        <div className="mt-12 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            What happens after you submit?
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">AI Analysis</h3>
              <p className="text-sm text-gray-600">
                Our AI analyzes your feedback to understand the category, priority, and sentiment.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-100 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Code Generation</h3>
              <p className="text-sm text-gray-600">
                If implementable, AI generates code changes to address your feedback.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-100 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2v0a2 2 0 01-2-2v-2a2 2 0 00-2-2H8z" />
                </svg>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Implementation</h3>
              <p className="text-sm text-gray-600">
                Changes are automatically committed to a new branch and a pull request is created.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Need help or have questions? Contact us at{' '}
            <a href="mailto:support@feedbackloop.com" className="text-blue-600 hover:text-blue-500">
              support@feedbackloop.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
