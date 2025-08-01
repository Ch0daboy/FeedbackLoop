import { CodeGenerationService } from './code-generation-service'
import { BranchManagementService } from './branch-management-service'
import { FileManagementService } from './file-management-service'
import { GitHubClient } from '@/lib/github/github-client'
import { FeedbackService } from './feedback-service'
import { ProjectService } from './project-service'
import { AnalysisService } from './analysis-service'

export interface ImplementationResult {
  feedbackId: string
  success: boolean
  branchName?: string
  commitSha?: string
  pullRequestUrl?: string
  errors: string[]
  steps: Array<{
    step: string
    status: 'pending' | 'in_progress' | 'completed' | 'failed'
    message?: string
    timestamp: Date
  }>
}

export class ImplementationOrchestrator {
  static async implementFeedback(
    feedbackId: string,
    accessToken: string
  ): Promise<ImplementationResult> {
    const result: ImplementationResult = {
      feedbackId,
      success: false,
      errors: [],
      steps: []
    }

    const addStep = (step: string, status: 'pending' | 'in_progress' | 'completed' | 'failed', message?: string) => {
      result.steps.push({
        step,
        status,
        message,
        timestamp: new Date()
      })
    }

    try {
      addStep('Validating feedback', 'in_progress')

      // Step 1: Validate feedback and get details
      const feedback = await FeedbackService.getFeedbackById(feedbackId)
      if (!feedback) {
        addStep('Validating feedback', 'failed', 'Feedback not found')
        result.errors.push('Feedback not found')
        return result
      }

      if (!feedback.analysis) {
        addStep('Validating feedback', 'failed', 'Feedback must be analyzed first')
        result.errors.push('Feedback must be analyzed first')
        return result
      }

      if (!feedback.analysis.isImplementable) {
        addStep('Validating feedback', 'failed', 'Feedback is not implementable')
        result.errors.push('Feedback is not implementable')
        return result
      }

      addStep('Validating feedback', 'completed')

      // Step 2: Get project details
      addStep('Getting project details', 'in_progress')
      
      const project = await ProjectService.getProjectById(feedback.projectId)
      if (!project) {
        addStep('Getting project details', 'failed', 'Project not found')
        result.errors.push('Project not found')
        return result
      }

      const repository = GitHubClient.parseRepositoryUrl(project.githubRepo)
      if (!repository) {
        addStep('Getting project details', 'failed', 'Invalid repository URL')
        result.errors.push('Invalid repository URL')
        return result
      }

      addStep('Getting project details', 'completed')

      // Step 3: Generate code
      addStep('Generating code', 'in_progress')
      
      let codeGeneration
      try {
        codeGeneration = await CodeGenerationService.generateImplementation(feedbackId)
        addStep('Generating code', 'completed', `Generated ${codeGeneration.files.length} files`)
      } catch (error) {
        addStep('Generating code', 'failed', error instanceof Error ? error.message : 'Code generation failed')
        result.errors.push('Code generation failed')
        return result
      }

      // Step 4: Create branch
      addStep('Creating branch', 'in_progress')
      
      let branchName = codeGeneration.branchName
      try {
        const branchResult = await BranchManagementService.createImplementationBranch(
          feedbackId,
          branchName,
          accessToken
        )

        if (!branchResult.created) {
          // If branch exists, generate a new name
          branchName = await BranchManagementService.generateBranchName(feedbackId)
          const retryResult = await BranchManagementService.createImplementationBranch(
            feedbackId,
            branchName,
            accessToken
          )
          
          if (!retryResult.created) {
            throw new Error(retryResult.error || 'Failed to create branch')
          }
        }

        result.branchName = branchName
        addStep('Creating branch', 'completed', `Created branch: ${branchName}`)
      } catch (error) {
        addStep('Creating branch', 'failed', error instanceof Error ? error.message : 'Branch creation failed')
        result.errors.push('Branch creation failed')
        return result
      }

      // Step 5: Apply file changes
      addStep('Applying file changes', 'in_progress')
      
      try {
        const fileOperations = FileManagementService.generateFileOperationsFromCode(codeGeneration.files)
        
        const fileResult = await FileManagementService.applyFileOperations(
          feedback.projectId,
          branchName,
          fileOperations,
          codeGeneration.commitMessage,
          accessToken
        )

        if (!fileResult.success) {
          throw new Error(`File operations failed: ${fileResult.errors.join(', ')}`)
        }

        result.commitSha = fileResult.commitSha
        addStep('Applying file changes', 'completed', `Committed ${fileOperations.length} files`)
      } catch (error) {
        addStep('Applying file changes', 'failed', error instanceof Error ? error.message : 'File operations failed')
        result.errors.push('File operations failed')
        return result
      }

      // Step 6: Create pull request
      addStep('Creating pull request', 'in_progress')
      
      try {
        const client = GitHubClient.withUserToken(accessToken)
        const pullRequest = await client.createPullRequest({
          repository,
          title: codeGeneration.prTitle,
          body: codeGeneration.prDescription,
          head: branchName
        })

        result.pullRequestUrl = pullRequest.html_url
        addStep('Creating pull request', 'completed', `Created PR: ${pullRequest.html_url}`)
      } catch (error) {
        addStep('Creating pull request', 'failed', error instanceof Error ? error.message : 'PR creation failed')
        result.errors.push('PR creation failed')
        // Don't return here - the implementation is still successful even if PR creation fails
      }

      // Step 7: Update database
      addStep('Updating database', 'in_progress')
      
      try {
        // Create implementation record
        await AnalysisService.createImplementation({
          feedbackId,
          githubBranch: branchName,
          claudeResponse: JSON.stringify(codeGeneration),
          generatedCode: codeGeneration.files.map(f => `// ${f.path}\n${f.content}`).join('\n\n'),
          status: result.pullRequestUrl ? 'COMPLETED' : 'CREATING_PR',
          githubPrUrl: result.pullRequestUrl
        })

        addStep('Updating database', 'completed')
      } catch (error) {
        addStep('Updating database', 'failed', error instanceof Error ? error.message : 'Database update failed')
        result.errors.push('Database update failed')
      }

      result.success = true
      return result

    } catch (error) {
      console.error('Error in implementation orchestrator:', error)
      addStep('Implementation', 'failed', error instanceof Error ? error.message : 'Unknown error')
      result.errors.push(error instanceof Error ? error.message : 'Unknown error')
      return result
    }
  }

  static async getImplementationStatus(feedbackId: string): Promise<{
    status: string
    branchName?: string
    pullRequestUrl?: string
    progress: number
    lastUpdate: Date
  }> {
    try {
      const implementation = await AnalysisService.getImplementationByFeedbackId(feedbackId)
      
      if (!implementation) {
        return {
          status: 'not_started',
          progress: 0,
          lastUpdate: new Date()
        }
      }

      const statusMap = {
        'PENDING': 10,
        'GENERATING_CODE': 30,
        'CREATING_BRANCH': 50,
        'COMMITTING_CODE': 70,
        'CREATING_PR': 90,
        'COMPLETED': 100,
        'FAILED': 0
      }

      return {
        status: implementation.status,
        branchName: implementation.githubBranch,
        pullRequestUrl: implementation.githubPrUrl || undefined,
        progress: statusMap[implementation.status] || 0,
        lastUpdate: implementation.updatedAt
      }

    } catch (error) {
      console.error('Error getting implementation status:', error)
      return {
        status: 'error',
        progress: 0,
        lastUpdate: new Date()
      }
    }
  }

  static async retryImplementation(
    feedbackId: string,
    accessToken: string
  ): Promise<ImplementationResult> {
    try {
      // Delete existing implementation if it exists
      const existingImplementation = await AnalysisService.getImplementationByFeedbackId(feedbackId)
      if (existingImplementation) {
        await AnalysisService.deleteImplementation(existingImplementation.id)
      }

      // Reset feedback status
      await FeedbackService.updateFeedbackStatus(feedbackId, 'ANALYZED')

      // Retry implementation
      return this.implementFeedback(feedbackId, accessToken)

    } catch (error) {
      console.error('Error retrying implementation:', error)
      return {
        feedbackId,
        success: false,
        errors: [error instanceof Error ? error.message : 'Retry failed'],
        steps: [{
          step: 'Retry',
          status: 'failed',
          message: error instanceof Error ? error.message : 'Retry failed',
          timestamp: new Date()
        }]
      }
    }
  }
}
