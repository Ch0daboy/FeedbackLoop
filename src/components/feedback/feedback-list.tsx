'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface FeedbackItem {
  id: string
  title: string
  status: string
  priority?: string
  sentiment?: string
  createdAt: string
  project: {
    id: string
    name: string
  }
  user?: {
    name: string
    email: string
  }
  email?: string
}

interface FeedbackListProps {
  projectId?: string
  limit?: number
  showProject?: boolean
}

export function FeedbackList({ projectId, limit = 10, showProject = true }: FeedbackListProps) {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    fetchFeedback()
  }, [projectId, page])

  const fetchFeedback = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      })
      
      if (projectId) {
        params.append('projectId', projectId)
      }

      const response = await fetch(`/api/feedback?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch feedback')
      }
      
      const data = await response.json()
      
      if (page === 1) {
        setFeedback(data.feedback)
      } else {
        setFeedback(prev => [...prev, ...data.feedback])
      }
      
      setHasMore(data.pagination.page < data.pagination.pages)
    } catch (error) {
      console.error('Error fetching feedback:', error)
      setError('Failed to load feedback')
    } finally {
      setLoading(false)
    }
  }

  const loadMore = () => {
    setPage(prev => prev + 1)
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

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case 'POSITIVE':
        return <span className="text-green-500">😊</span>
      case 'NEGATIVE':
        return <span className="text-red-500">😞</span>
      case 'NEUTRAL':
        return <span className="text-gray-500">😐</span>
      default:
        return null
    }
  }

  if (loading && page === 1) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border-b border-gray-200 pb-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="flex space-x-2">
                <div className="h-5 bg-gray-200 rounded w-16"></div>
                <div className="h-5 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center">
          <div className="text-red-600 mb-2">
            <svg className="h-8 w-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => {
              setPage(1)
              fetchFeedback()
            }}
            className="mt-2 text-blue-600 hover:text-blue-500"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">
          {projectId ? 'Project Feedback' : 'All Feedback'}
        </h2>
      </div>
      
      <div className="divide-y divide-gray-200">
        {feedback.length > 0 ? (
          <>
            {feedback.map((item) => (
              <div key={item.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/feedback/${item.id}`}
                      className="block hover:text-blue-600"
                    >
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {item.title}
                      </h3>
                    </Link>
                    
                    <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                      {showProject && (
                        <span>Project: {item.project.name}</span>
                      )}
                      <span>
                        {item.user ? (
                          `By ${item.user.name}`
                        ) : item.email ? (
                          `By ${item.email}`
                        ) : (
                          'Anonymous'
                        )}
                      </span>
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {item.sentiment && getSentimentIcon(item.sentiment)}
                    
                    {item.priority && (
                      <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                      </span>
                    )}
                    
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            {hasMore && (
              <div className="px-6 py-4 text-center border-t border-gray-200">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="text-blue-600 hover:text-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="px-6 py-8 text-center">
            <div className="text-gray-400 mb-2">
              <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-1l-4 4z" />
              </svg>
            </div>
            <p className="text-gray-500 mb-2">No feedback found</p>
            <Link
              href="/feedback?projectId=demo"
              className="text-blue-600 hover:text-blue-500"
            >
              Submit the first feedback
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
