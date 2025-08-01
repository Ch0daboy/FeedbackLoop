import { test, expect } from '@playwright/test'

test.describe('Complete Feedback Workflow', () => {
  test('should complete full feedback lifecycle', async ({ page }) => {
    // Step 1: Submit feedback
    await page.goto('/feedback?projectId=demo')
    
    // Mock project API
    await page.route('/api/projects/demo', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'demo',
          name: 'Demo Project',
          description: 'A demo project for testing',
          feedbackCount: 0
        })
      })
    })

    // Mock feedback submission
    await page.route('/api/feedback', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            feedback: {
              id: 'feedback-test-123',
              title: 'Test workflow feedback',
              description: 'This is a test feedback for the complete workflow',
              status: 'PENDING',
              projectId: 'demo'
            }
          })
        })
      }
    })

    // Fill and submit feedback form
    await page.fill('input[name="title"]', 'Test workflow feedback')
    await page.fill('textarea[name="description"]', 'This is a test feedback for the complete workflow that should trigger analysis and implementation')
    await page.fill('input[name="email"]', 'workflow@test.com')
    await page.click('button[type="submit"]')

    // Verify submission success
    await expect(page.locator('text=Feedback submitted successfully')).toBeVisible()

    // Step 2: Navigate to feedback detail page
    await page.goto('/feedback/feedback-test-123')

    // Mock feedback detail API
    await page.route('/api/feedback/feedback-test-123', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          feedback: {
            id: 'feedback-test-123',
            title: 'Test workflow feedback',
            description: 'This is a test feedback for the complete workflow that should trigger analysis and implementation',
            email: 'workflow@test.com',
            status: 'PENDING',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            project: {
              id: 'demo',
              name: 'Demo Project'
            }
          }
        })
      })
    })

    // Verify feedback details are displayed
    await expect(page.locator('h2:has-text("Test workflow feedback")')).toBeVisible()
    await expect(page.locator('text=PENDING')).toBeVisible()

    // Step 3: Trigger analysis
    await page.route('/api/feedback/feedback-test-123/analyze', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          analysis: {
            feedbackId: 'feedback-test-123',
            category: 'Feature Request',
            priority: 'MEDIUM',
            sentiment: 'POSITIVE',
            isImplementable: true,
            implementationSuggestion: 'Add the requested feature to the main dashboard',
            analysisId: 'analysis-123'
          }
        })
      })
    })

    // Click analyze button
    await page.click('button:has-text("Analyze")')

    // Handle alert
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Analysis completed successfully')
      await dialog.accept()
    })

    // Step 4: Verify analysis results
    // Mock updated feedback with analysis
    await page.route('/api/feedback/feedback-test-123', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          feedback: {
            id: 'feedback-test-123',
            title: 'Test workflow feedback',
            description: 'This is a test feedback for the complete workflow that should trigger analysis and implementation',
            email: 'workflow@test.com',
            status: 'ANALYZED',
            category: 'Feature Request',
            priority: 'MEDIUM',
            sentiment: 'POSITIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            project: {
              id: 'demo',
              name: 'Demo Project'
            },
            analysis: {
              id: 'analysis-123',
              extractedCategory: 'Feature Request',
              extractedPriority: 'MEDIUM',
              extractedSentiment: 'POSITIVE',
              isImplementable: true,
              implementationSuggestion: 'Add the requested feature to the main dashboard',
              createdAt: new Date().toISOString()
            }
          }
        })
      })
    })

    // Refresh page to see analysis results
    await page.reload()

    // Verify analysis results are displayed
    await expect(page.locator('text=ANALYZED')).toBeVisible()
    await expect(page.locator('text=AI Analysis')).toBeVisible()
    await expect(page.locator('text=Feature Request')).toBeVisible()
    await expect(page.locator('text=MEDIUM')).toBeVisible()
    await expect(page.locator('text=POSITIVE')).toBeVisible()
    await expect(page.locator('text=Yes')).toBeVisible() // Implementable

    // Step 5: Trigger implementation
    await page.route('/api/implementation', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          result: {
            feedbackId: 'feedback-test-123',
            success: true,
            branchName: 'feature/test-workflow-feedback-123',
            commitSha: 'abc123def456',
            pullRequestUrl: 'https://github.com/demo/repo/pull/123',
            errors: [],
            steps: [
              { step: 'Validating feedback', status: 'completed', timestamp: new Date().toISOString() },
              { step: 'Generating code', status: 'completed', timestamp: new Date().toISOString() },
              { step: 'Creating branch', status: 'completed', timestamp: new Date().toISOString() },
              { step: 'Committing code', status: 'completed', timestamp: new Date().toISOString() },
              { step: 'Creating pull request', status: 'completed', timestamp: new Date().toISOString() }
            ]
          }
        })
      })
    })

    // Mock GitHub token prompt
    page.on('dialog', async dialog => {
      if (dialog.message().includes('GitHub access token')) {
        await dialog.accept('mock-github-token')
      } else if (dialog.message().includes('Implementation started successfully')) {
        await dialog.accept()
      }
    })

    // Click implement button
    await page.click('button:has-text("Implement")')

    // Step 6: Verify implementation results
    // Mock final feedback state with implementation
    await page.route('/api/feedback/feedback-test-123', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          feedback: {
            id: 'feedback-test-123',
            title: 'Test workflow feedback',
            description: 'This is a test feedback for the complete workflow that should trigger analysis and implementation',
            email: 'workflow@test.com',
            status: 'IMPLEMENTED',
            category: 'Feature Request',
            priority: 'MEDIUM',
            sentiment: 'POSITIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            project: {
              id: 'demo',
              name: 'Demo Project'
            },
            analysis: {
              id: 'analysis-123',
              extractedCategory: 'Feature Request',
              extractedPriority: 'MEDIUM',
              extractedSentiment: 'POSITIVE',
              isImplementable: true,
              implementationSuggestion: 'Add the requested feature to the main dashboard',
              createdAt: new Date().toISOString()
            },
            implementation: {
              id: 'impl-123',
              githubBranch: 'feature/test-workflow-feedback-123',
              status: 'COMPLETED',
              githubPrUrl: 'https://github.com/demo/repo/pull/123',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          }
        })
      })
    })

    // Refresh to see implementation results
    await page.reload()

    // Verify implementation section is displayed
    await expect(page.locator('text=Implementation')).toBeVisible()
    await expect(page.locator('text=COMPLETED')).toBeVisible()
    await expect(page.locator('text=feature/test-workflow-feedback-123')).toBeVisible()
    await expect(page.locator('a[href="https://github.com/demo/repo/pull/123"]')).toBeVisible()

    // Verify timeline shows all steps
    await expect(page.locator('text=Timeline')).toBeVisible()
    await expect(page.locator('text=Feedback submitted')).toBeVisible()
    await expect(page.locator('text=AI analysis completed')).toBeVisible()
    await expect(page.locator('text=Implementation started')).toBeVisible()
  })

  test('should handle workflow errors gracefully', async ({ page }) => {
    await page.goto('/feedback/feedback-error-test')

    // Mock feedback that fails analysis
    await page.route('/api/feedback/feedback-error-test', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          feedback: {
            id: 'feedback-error-test',
            title: 'Error test feedback',
            description: 'This feedback will fail analysis',
            status: 'PENDING',
            createdAt: new Date().toISOString(),
            project: { id: 'demo', name: 'Demo Project' }
          }
        })
      })
    })

    // Mock analysis failure
    await page.route('/api/feedback/feedback-error-test/analyze', async route => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'AI service error',
          message: 'Rate limit exceeded for gemini',
          service: 'gemini',
          retryable: true
        })
      })
    })

    await page.click('button:has-text("Analyze")')

    // Should handle error gracefully
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Failed to trigger analysis')
      await dialog.accept()
    })
  })
})
