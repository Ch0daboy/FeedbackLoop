import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FeedbackForm } from '../feedback-form'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('FeedbackForm', () => {
  const defaultProps = {
    projectId: 'test-project-id',
    onSuccess: jest.fn(),
    onError: jest.fn()
  }

  beforeEach(() => {
    mockFetch.mockClear()
    defaultProps.onSuccess.mockClear()
    defaultProps.onError.mockClear()
  })

  it('renders form fields correctly', () => {
    render(<FeedbackForm {...defaultProps} />)
    
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submit feedback/i })).toBeInTheDocument()
  })

  it('shows validation errors for empty required fields', async () => {
    const user = userEvent.setup()
    render(<FeedbackForm {...defaultProps} />)
    
    const submitButton = screen.getByRole('button', { name: /submit feedback/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument()
    })
  })

  it('shows validation error for short description', async () => {
    const user = userEvent.setup()
    render(<FeedbackForm {...defaultProps} />)
    
    const titleInput = screen.getByLabelText(/title/i)
    const descriptionInput = screen.getByLabelText(/description/i)
    const submitButton = screen.getByRole('button', { name: /submit feedback/i })
    
    await user.type(titleInput, 'Test title')
    await user.type(descriptionInput, 'Short')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/at least 10 characters/i)).toBeInTheDocument()
    })
  })

  it('shows validation error for invalid email', async () => {
    const user = userEvent.setup()
    render(<FeedbackForm {...defaultProps} />)
    
    const titleInput = screen.getByLabelText(/title/i)
    const descriptionInput = screen.getByLabelText(/description/i)
    const emailInput = screen.getByLabelText(/email/i)
    const submitButton = screen.getByRole('button', { name: /submit feedback/i })
    
    await user.type(titleInput, 'Test title')
    await user.type(descriptionInput, 'This is a valid description that is long enough')
    await user.type(emailInput, 'invalid-email')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument()
    })
  })

  it('submits form with valid data', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        feedback: { id: 'test-id', title: 'Test title' }
      })
    })
    
    render(<FeedbackForm {...defaultProps} />)
    
    const titleInput = screen.getByLabelText(/title/i)
    const descriptionInput = screen.getByLabelText(/description/i)
    const emailInput = screen.getByLabelText(/email/i)
    const submitButton = screen.getByRole('button', { name: /submit feedback/i })
    
    await user.type(titleInput, 'Test feedback title')
    await user.type(descriptionInput, 'This is a detailed description of the feedback')
    await user.type(emailInput, 'test@example.com')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Test feedback title',
          description: 'This is a detailed description of the feedback',
          email: 'test@example.com',
          projectId: 'test-project-id'
        })
      })
    })
    
    await waitFor(() => {
      expect(defaultProps.onSuccess).toHaveBeenCalledWith({
        id: 'test-id',
        title: 'Test title'
      })
    })
  })

  it('handles submission error', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: 'Submission failed'
      })
    })
    
    render(<FeedbackForm {...defaultProps} />)
    
    const titleInput = screen.getByLabelText(/title/i)
    const descriptionInput = screen.getByLabelText(/description/i)
    const submitButton = screen.getByRole('button', { name: /submit feedback/i })
    
    await user.type(titleInput, 'Test feedback title')
    await user.type(descriptionInput, 'This is a detailed description of the feedback')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(defaultProps.onError).toHaveBeenCalledWith('Submission failed')
    })
  })

  it('shows character count for description', async () => {
    const user = userEvent.setup()
    render(<FeedbackForm {...defaultProps} />)
    
    const descriptionInput = screen.getByLabelText(/description/i)
    
    expect(screen.getByText('0/5000')).toBeInTheDocument()
    
    await user.type(descriptionInput, 'Test description')
    
    expect(screen.getByText('16/5000')).toBeInTheDocument()
  })

  it('shows success message after successful submission', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        feedback: { id: 'test-id' }
      })
    })
    
    render(<FeedbackForm {...defaultProps} />)
    
    const titleInput = screen.getByLabelText(/title/i)
    const descriptionInput = screen.getByLabelText(/description/i)
    const submitButton = screen.getByRole('button', { name: /submit feedback/i })
    
    await user.type(titleInput, 'Test title')
    await user.type(descriptionInput, 'Test description that is long enough')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/feedback submitted successfully/i)).toBeInTheDocument()
    })
  })

  it('disables submit button while submitting', async () => {
    const user = userEvent.setup()
    // Mock a slow response
    mockFetch.mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ success: true, feedback: {} })
      }), 100))
    )
    
    render(<FeedbackForm {...defaultProps} />)
    
    const titleInput = screen.getByLabelText(/title/i)
    const descriptionInput = screen.getByLabelText(/description/i)
    const submitButton = screen.getByRole('button', { name: /submit feedback/i })
    
    await user.type(titleInput, 'Test title')
    await user.type(descriptionInput, 'Test description that is long enough')
    await user.click(submitButton)
    
    expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled()
  })
})
