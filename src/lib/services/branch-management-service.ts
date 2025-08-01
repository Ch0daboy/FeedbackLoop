import { GitHubClient, GitHubRepository } from '@/lib/github/github-client'
import { FeedbackService } from './feedback-service'
import { ProjectService } from './project-service'
import { db } from '@/lib/db'

export interface BranchCreationResult {
  branchName: string
  repository: GitHubRepository
  baseBranch: string
  created: boolean
  error?: string
}

export class BranchManagementService {
  static async createImplementationBranch(
    feedbackId: string,
    branchName: string,
    accessToken: string
  ): Promise<BranchCreationResult> {
    try {
      // Get feedback and project details
      const feedback = await FeedbackService.getFeedbackById(feedbackId)
      if (!feedback) {
        throw new Error('Feedback not found')
      }

      const project = await ProjectService.getProjectById(feedback.projectId)
      if (!project) {
        throw new Error('Project not found')
      }

      // Parse repository URL
      const repository = GitHubClient.parseRepositoryUrl(project.githubRepo)
      if (!repository) {
        throw new Error('Invalid GitHub repository URL')
      }

      // Create GitHub client with user's access token
      const client = GitHubClient.withUserToken(accessToken)

      // Get default branch
      const baseBranch = await client.getDefaultBranch(repository)

      // Check if branch already exists
      const branchExists = await client.branchExists(repository, branchName)
      if (branchExists) {
        return {
          branchName,
          repository,
          baseBranch,
          created: false,
          error: 'Branch already exists'
        }
      }

      // Create the branch
      await client.createBranch({
        repository,
        branchName,
        fromBranch: baseBranch
      })

      return {
        branchName,
        repository,
        baseBranch,
        created: true
      }

    } catch (error) {
      console.error('Error creating implementation branch:', error)
      throw error
    }
  }

  static async generateBranchName(feedbackId: string): Promise<string> {
    try {
      const feedback = await FeedbackService.getFeedbackById(feedbackId)
      if (!feedback) {
        throw new Error('Feedback not found')
      }

      // Create a branch name based on feedback
      const category = feedback.analysis?.extractedCategory || 'general'
      const title = feedback.title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .slice(0, 30) // Limit length

      const timestamp = Date.now().toString().slice(-6) // Last 6 digits of timestamp
      
      let branchName: string
      
      switch (category.toLowerCase()) {
        case 'bug report':
          branchName = `fix/${title}-${timestamp}`
          break
        case 'feature request':
          branchName = `feature/${title}-${timestamp}`
          break
        case 'ui/ux improvement':
          branchName = `ui/${title}-${timestamp}`
          break
        case 'performance issue':
          branchName = `perf/${title}-${timestamp}`
          break
        case 'documentation':
          branchName = `docs/${title}-${timestamp}`
          break
        default:
          branchName = `improvement/${title}-${timestamp}`
      }

      // Ensure branch name is valid (no consecutive hyphens, etc.)
      branchName = branchName.replace(/-+/g, '-').replace(/^-|-$/g, '')
      
      return branchName

    } catch (error) {
      console.error('Error generating branch name:', error)
      // Fallback to simple naming
      const timestamp = Date.now().toString().slice(-6)
      return `feedback-${feedbackId.slice(-8)}-${timestamp}`
    }
  }

  static async listImplementationBranches(
    projectId: string,
    accessToken: string
  ): Promise<Array<{
    branchName: string
    feedbackId?: string
    created: Date
    status: string
  }>> {
    try {
      const project = await ProjectService.getProjectById(projectId)
      if (!project) {
        throw new Error('Project not found')
      }

      const repository = GitHubClient.parseRepositoryUrl(project.githubRepo)
      if (!repository) {
        throw new Error('Invalid GitHub repository URL')
      }

      const client = GitHubClient.withUserToken(accessToken)
      const branches = await client.listBranches(repository)

      // Filter branches that look like implementation branches
      const implementationBranches = branches.filter(branch => 
        branch.startsWith('feature/') ||
        branch.startsWith('fix/') ||
        branch.startsWith('ui/') ||
        branch.startsWith('perf/') ||
        branch.startsWith('docs/') ||
        branch.startsWith('improvement/')
      )

      // Get implementation records from database
      const implementations = await db.implementation.findMany({
        where: {
          feedback: {
            projectId
          }
        },
        include: {
          feedback: true
        }
      })

      // Map branches to implementation data
      return implementationBranches.map(branchName => {
        const implementation = implementations.find(impl => 
          impl.githubBranch === branchName
        )

        return {
          branchName,
          feedbackId: implementation?.feedbackId,
          created: implementation?.createdAt || new Date(),
          status: implementation?.status || 'unknown'
        }
      })

    } catch (error) {
      console.error('Error listing implementation branches:', error)
      return []
    }
  }

  static async cleanupOldBranches(
    projectId: string,
    accessToken: string,
    olderThanDays: number = 30
  ): Promise<{
    deleted: string[]
    errors: Array<{ branch: string; error: string }>
  }> {
    try {
      const project = await ProjectService.getProjectById(projectId)
      if (!project) {
        throw new Error('Project not found')
      }

      const repository = GitHubClient.parseRepositoryUrl(project.githubRepo)
      if (!repository) {
        throw new Error('Invalid GitHub repository URL')
      }

      // Get completed implementations older than specified days
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

      const oldImplementations = await db.implementation.findMany({
        where: {
          feedback: {
            projectId
          },
          status: 'COMPLETED',
          createdAt: {
            lt: cutoffDate
          }
        }
      })

      const deleted: string[] = []
      const errors: Array<{ branch: string; error: string }> = []

      // Note: Actually deleting branches is dangerous and should be done carefully
      // For now, we'll just return what would be deleted
      for (const implementation of oldImplementations) {
        try {
          // In a real implementation, you might want to:
          // 1. Check if the branch has been merged
          // 2. Confirm with the user before deletion
          // 3. Only delete if the PR is closed/merged
          
          console.log(`Would delete branch: ${implementation.githubBranch}`)
          deleted.push(implementation.githubBranch)
          
        } catch (error) {
          errors.push({
            branch: implementation.githubBranch,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      return { deleted, errors }

    } catch (error) {
      console.error('Error cleaning up old branches:', error)
      return { deleted: [], errors: [{ branch: 'all', error: 'Cleanup failed' }] }
    }
  }

  static async validateBranchName(branchName: string): Promise<{
    isValid: boolean
    errors: string[]
    suggestions: string[]
  }> {
    const errors: string[] = []
    const suggestions: string[] = []

    // Check length
    if (branchName.length < 3) {
      errors.push('Branch name must be at least 3 characters long')
    }

    if (branchName.length > 100) {
      errors.push('Branch name must be less than 100 characters long')
      suggestions.push('Consider shortening the branch name')
    }

    // Check for invalid characters
    if (!/^[a-zA-Z0-9/_-]+$/.test(branchName)) {
      errors.push('Branch name can only contain letters, numbers, hyphens, underscores, and forward slashes')
    }

    // Check for invalid patterns
    if (branchName.startsWith('-') || branchName.endsWith('-')) {
      errors.push('Branch name cannot start or end with a hyphen')
    }

    if (branchName.includes('//')) {
      errors.push('Branch name cannot contain consecutive forward slashes')
    }

    if (branchName.includes('..')) {
      errors.push('Branch name cannot contain consecutive dots')
    }

    // Check for reserved names
    const reservedNames = ['HEAD', 'master', 'main']
    if (reservedNames.includes(branchName)) {
      errors.push('Branch name cannot be a reserved name')
    }

    // Suggestions for improvement
    if (!branchName.includes('/')) {
      suggestions.push('Consider using a prefix like feature/, fix/, or docs/')
    }

    if (branchName.includes('_')) {
      suggestions.push('Consider using hyphens instead of underscores')
    }

    return {
      isValid: errors.length === 0,
      errors,
      suggestions
    }
  }
}
