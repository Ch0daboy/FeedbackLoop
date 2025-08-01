import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      // Mock NextAuth session
      window.localStorage.setItem('nextauth.session-token', 'mock-session-token')
    })

    // Mock API responses
    await page.route('/api/dashboard/stats', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          stats: {
            totalFeedback: 15,
            pendingAnalysis: 3,
            analyzedFeedback: 8,
            implementedCount: 4,
            projectCount: 2,
            recentActivity: 5,
            analysisRate: 80,
            implementationRate: 27
          }
        })
      })
    })

    await page.route('/api/feedback*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          feedback: [
            {
              id: 'feedback-1',
              title: 'Add dark mode support',
              status: 'PENDING',
              priority: 'MEDIUM',
              sentiment: 'POSITIVE',
              createdAt: new Date().toISOString(),
              project: { id: 'project-1', name: 'Demo Project' },
              user: { name: 'Test User', email: 'test@example.com' }
            },
            {
              id: 'feedback-2',
              title: 'Fix login button issue',
              status: 'ANALYZED',
              priority: 'HIGH',
              sentiment: 'NEGATIVE',
              createdAt: new Date().toISOString(),
              project: { id: 'project-1', name: 'Demo Project' },
              email: 'user@example.com'
            }
          ],
          pagination: {
            page: 1,
            limit: 5,
            total: 2,
            pages: 1
          }
        })
      })
    })
  })

  test('should redirect to signin when not authenticated', async ({ page }) => {
    // Clear any existing auth
    await page.context().clearCookies()
    
    // Try to access dashboard
    await page.goto('/dashboard')
    
    // Should redirect to signin
    await expect(page).toHaveURL(/\/auth\/signin/)
  })

  test('should display dashboard stats correctly', async ({ page }) => {
    // Mock successful authentication
    await page.route('/api/auth/session', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'user-1', name: 'Test User', email: 'test@example.com' }
        })
      })
    })

    await page.goto('/dashboard')
    
    // Check if stats are displayed
    await expect(page.locator('text=Total Feedback')).toBeVisible()
    await expect(page.locator('text=15')).toBeVisible() // Total feedback count
    await expect(page.locator('text=Pending Analysis')).toBeVisible()
    await expect(page.locator('text=3')).toBeVisible() // Pending count
    await expect(page.locator('text=Implemented')).toBeVisible()
    await expect(page.locator('text=4')).toBeVisible() // Implemented count
  })

  test('should display recent feedback list', async ({ page }) => {
    await page.route('/api/auth/session', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'user-1', name: 'Test User', email: 'test@example.com' }
        })
      })
    })

    await page.goto('/dashboard')
    
    // Check if feedback list is displayed
    await expect(page.locator('text=All Feedback')).toBeVisible()
    await expect(page.locator('text=Add dark mode support')).toBeVisible()
    await expect(page.locator('text=Fix login button issue')).toBeVisible()
    
    // Check status badges
    await expect(page.locator('text=PENDING')).toBeVisible()
    await expect(page.locator('text=ANALYZED')).toBeVisible()
    
    // Check priority badges
    await expect(page.locator('text=MEDIUM')).toBeVisible()
    await expect(page.locator('text=HIGH')).toBeVisible()
  })

  test('should trigger batch analysis', async ({ page }) => {
    await page.route('/api/auth/session', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'user-1', name: 'Test User', email: 'test@example.com' }
        })
      })
    })

    // Mock batch analysis API
    await page.route('/api/analysis/batch', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          analyzed: 3,
          message: 'Successfully analyzed 3 feedback items'
        })
      })
    })

    await page.goto('/dashboard')
    
    // Click analyze pending button
    await page.click('button:has-text("Analyze Pending")')
    
    // Check for success alert (this would be an alert in the current implementation)
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Batch analysis completed: 3 items analyzed')
      await dialog.accept()
    })
  })

  test('should navigate to feedback detail page', async ({ page }) => {
    await page.route('/api/auth/session', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'user-1', name: 'Test User', email: 'test@example.com' }
        })
      })
    })

    await page.goto('/dashboard')
    
    // Click on a feedback item
    await page.click('text=Add dark mode support')
    
    // Should navigate to feedback detail page
    await expect(page).toHaveURL(/\/feedback\/feedback-1/)
  })

  test('should handle empty feedback list', async ({ page }) => {
    await page.route('/api/auth/session', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'user-1', name: 'Test User', email: 'test@example.com' }
        })
      })
    })

    // Mock empty feedback response
    await page.route('/api/feedback*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          feedback: [],
          pagination: { page: 1, limit: 5, total: 0, pages: 0 }
        })
      })
    })

    await page.goto('/dashboard')
    
    // Check for empty state
    await expect(page.locator('text=No feedback found')).toBeVisible()
    await expect(page.locator('text=Submit the first feedback')).toBeVisible()
  })

  test('should be responsive on mobile', async ({ page }) => {
    await page.route('/api/auth/session', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'user-1', name: 'Test User', email: 'test@example.com' }
        })
      })
    })

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/dashboard')
    
    // Check if dashboard is usable on mobile
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible()
    await expect(page.locator('text=Total Feedback')).toBeVisible()
    
    // Stats should stack vertically on mobile
    const statsCards = page.locator('[class*="grid"]').first()
    await expect(statsCards).toBeVisible()
  })

  test('should handle API errors gracefully', async ({ page }) => {
    await page.route('/api/auth/session', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'user-1', name: 'Test User', email: 'test@example.com' }
        })
      })
    })

    // Mock API error
    await page.route('/api/dashboard/stats', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      })
    })

    await page.goto('/dashboard')
    
    // Should show error state
    await expect(page.locator('text=Failed to load dashboard data')).toBeVisible()
    await expect(page.locator('button:has-text("Retry")')).toBeVisible()
  })
})
