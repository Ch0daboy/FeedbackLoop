import { test, expect } from '@playwright/test'

test.describe('Feedback Submission', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the feedback form
    await page.goto('/feedback?projectId=demo')
  })

  test('should display feedback form correctly', async ({ page }) => {
    // Check if the form elements are present
    await expect(page.locator('h2')).toContainText('Submit Feedback')
    await expect(page.locator('input[name="title"]')).toBeVisible()
    await expect(page.locator('textarea[name="description"]')).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should show validation errors for empty form', async ({ page }) => {
    // Try to submit empty form
    await page.click('button[type="submit"]')
    
    // Check for validation errors
    await expect(page.locator('text=Title is required')).toBeVisible()
  })

  test('should show validation error for short description', async ({ page }) => {
    // Fill in title but short description
    await page.fill('input[name="title"]', 'Test feedback')
    await page.fill('textarea[name="description"]', 'Short')
    await page.click('button[type="submit"]')
    
    // Check for validation error
    await expect(page.locator('text=at least 10 characters')).toBeVisible()
  })

  test('should show validation error for invalid email', async ({ page }) => {
    // Fill in valid title and description, invalid email
    await page.fill('input[name="title"]', 'Test feedback')
    await page.fill('textarea[name="description"]', 'This is a detailed description that is long enough')
    await page.fill('input[name="email"]', 'invalid-email')
    await page.click('button[type="submit"]')
    
    // Check for validation error
    await expect(page.locator('text=Invalid email address')).toBeVisible()
  })

  test('should submit feedback successfully', async ({ page }) => {
    // Mock the API response
    await page.route('/api/feedback', async route => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          feedback: {
            id: 'test-feedback-id',
            title: 'Test feedback',
            description: 'This is a test feedback description',
            status: 'PENDING'
          }
        })
      })
    })

    // Fill in the form
    await page.fill('input[name="title"]', 'Test feedback')
    await page.fill('textarea[name="description"]', 'This is a detailed description of the feedback that should be long enough to pass validation')
    await page.fill('input[name="email"]', 'test@example.com')
    
    // Submit the form
    await page.click('button[type="submit"]')
    
    // Check for success message
    await expect(page.locator('text=Feedback submitted successfully')).toBeVisible()
  })

  test('should show character count for description', async ({ page }) => {
    // Check initial character count
    await expect(page.locator('text=0/5000')).toBeVisible()
    
    // Type in description and check updated count
    await page.fill('textarea[name="description"]', 'Test description')
    await expect(page.locator('text=16/5000')).toBeVisible()
  })

  test('should handle API error gracefully', async ({ page }) => {
    // Mock API error
    await page.route('/api/feedback', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal server error'
        })
      })
    })

    // Fill and submit form
    await page.fill('input[name="title"]', 'Test feedback')
    await page.fill('textarea[name="description"]', 'This is a detailed description that is long enough')
    await page.click('button[type="submit"]')
    
    // Check for error message
    await expect(page.locator('text=Failed to submit feedback')).toBeVisible()
  })

  test('should disable submit button while submitting', async ({ page }) => {
    // Mock slow API response
    await page.route('/api/feedback', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, feedback: {} })
      })
    })

    // Fill form
    await page.fill('input[name="title"]', 'Test feedback')
    await page.fill('textarea[name="description"]', 'This is a detailed description that is long enough')
    
    // Submit and check button state
    await page.click('button[type="submit"]')
    await expect(page.locator('button[type="submit"]')).toBeDisabled()
    await expect(page.locator('text=Submitting...')).toBeVisible()
  })

  test('should work on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Check if form is still usable on mobile
    await expect(page.locator('input[name="title"]')).toBeVisible()
    await expect(page.locator('textarea[name="description"]')).toBeVisible()
    
    // Fill and submit form on mobile
    await page.fill('input[name="title"]', 'Mobile feedback')
    await page.fill('textarea[name="description"]', 'This feedback was submitted from a mobile device')
    
    // Mock successful response
    await page.route('/api/feedback', async route => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, feedback: {} })
      })
    })
    
    await page.click('button[type="submit"]')
    await expect(page.locator('text=Feedback submitted successfully')).toBeVisible()
  })
})
