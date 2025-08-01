import { claudeClient } from '@/lib/ai/claude-client'
import { FeedbackService } from './feedback-service'
import { ProjectService } from './project-service'
import { FeedbackAnalysisService } from './feedback-analysis-service'
import { handleAIError, retryWithBackoff } from '@/lib/ai/error-handling'
import { withRateLimit } from '@/lib/ai/rate-limiter'

export interface CodeGenerationResult {
  feedbackId: string
  files: Array<{
    path: string
    content: string
    action: 'create' | 'modify' | 'delete'
  }>
  commitMessage: string
  branchName: string
  prTitle: string
  prDescription: string
  estimatedComplexity: 'LOW' | 'MEDIUM' | 'HIGH'
  generationMethod: 'claude' | 'template'
}

export class CodeGenerationService {
  static async generateImplementation(feedbackId: string): Promise<CodeGenerationResult> {
    try {
      // Get feedback with analysis
      const feedback = await FeedbackService.getFeedbackById(feedbackId)
      if (!feedback) {
        throw new Error('Feedback not found')
      }

      if (!feedback.analysis) {
        throw new Error('Feedback must be analyzed before generating implementation')
      }

      if (!feedback.analysis.isImplementable) {
        throw new Error('Feedback is not marked as implementable')
      }

      // Get project details
      const project = await ProjectService.getProjectById(feedback.projectId)
      if (!project) {
        throw new Error('Project not found')
      }

      // Generate implementation plan if not already available
      let implementationPlan = feedback.analysis.implementationSuggestion
      if (!implementationPlan) {
        console.log('Generating implementation plan for feedback:', feedbackId)
        const planResult = await FeedbackAnalysisService.generateImplementationPlan(feedbackId)
        implementationPlan = planResult.plan
      }

      // Prepare project context
      const projectContext = {
        name: project.name,
        description: project.description || undefined,
        githubRepo: project.githubRepo,
        techStack: this.inferTechStack(project.githubRepo),
        existingFiles: [] // TODO: Could fetch from GitHub API
      }

      // Generate code with Claude using rate limiting and retry logic
      const codeResult = await retryWithBackoff(async () => {
        return withRateLimit('claude', async () => {
          return claudeClient.generateImplementation(
            feedback.title,
            feedback.description,
            feedback.analysis!.extractedCategory || 'General',
            implementationPlan || 'Implement the requested feature',
            projectContext
          )
        })
      })

      // Determine complexity based on number of files and content
      const estimatedComplexity = this.estimateComplexity(codeResult.files)

      return {
        feedbackId: feedback.id,
        files: codeResult.files,
        commitMessage: codeResult.commitMessage,
        branchName: codeResult.branchName,
        prTitle: codeResult.prTitle,
        prDescription: codeResult.prDescription,
        estimatedComplexity,
        generationMethod: 'claude'
      }

    } catch (error) {
      console.error('Error generating implementation:', error)
      
      // Try template-based fallback for simple cases
      try {
        console.log('Attempting template-based code generation for feedback:', feedbackId)
        return await this.generateWithTemplate(feedbackId)
      } catch (fallbackError) {
        console.error('Template-based generation also failed:', fallbackError)
        const aiError = handleAIError(error, 'claude')
        throw aiError
      }
    }
  }

  private static async generateWithTemplate(feedbackId: string): Promise<CodeGenerationResult> {
    const feedback = await FeedbackService.getFeedbackById(feedbackId)
    if (!feedback || !feedback.analysis) {
      throw new Error('Invalid feedback for template generation')
    }

    const project = await ProjectService.getProjectById(feedback.projectId)
    if (!project) {
      throw new Error('Project not found')
    }

    // Generate simple template-based implementation
    const category = feedback.analysis.extractedCategory || 'General'
    const files = this.generateTemplateFiles(category, feedback.title, feedback.description)
    
    const branchName = `feature/${feedback.title.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 50)}`
    
    return {
      feedbackId: feedback.id,
      files,
      commitMessage: `Implement: ${feedback.title}`,
      branchName,
      prTitle: `Implement: ${feedback.title}`,
      prDescription: `Template-based implementation for: ${feedback.description}`,
      estimatedComplexity: 'LOW',
      generationMethod: 'template'
    }
  }

  private static generateTemplateFiles(
    category: string,
    title: string,
    description: string
  ): Array<{ path: string; content: string; action: 'create' | 'modify' | 'delete' }> {
    const sanitizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '-')
    
    switch (category) {
      case 'Feature Request':
        return [
          {
            path: `src/components/${sanitizedTitle}.tsx`,
            content: this.generateReactComponentTemplate(title, description),
            action: 'create'
          },
          {
            path: `src/pages/${sanitizedTitle}.tsx`,
            content: this.generatePageTemplate(title, description),
            action: 'create'
          }
        ]
      
      case 'Bug Report':
        return [
          {
            path: `src/fixes/${sanitizedTitle}.ts`,
            content: this.generateBugFixTemplate(title, description),
            action: 'create'
          }
        ]
      
      default:
        return [
          {
            path: `src/improvements/${sanitizedTitle}.ts`,
            content: this.generateGeneralTemplate(title, description),
            action: 'create'
          }
        ]
    }
  }

  private static generateReactComponentTemplate(title: string, description: string): string {
    const componentName = title.replace(/[^a-zA-Z0-9]/g, '').replace(/^./, str => str.toUpperCase())
    
    return `import React from 'react'

interface ${componentName}Props {
  // Add props as needed
}

/**
 * ${title}
 * ${description}
 */
export const ${componentName}: React.FC<${componentName}Props> = (props) => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">${title}</h2>
      <p className="text-gray-600">
        ${description}
      </p>
      {/* TODO: Implement component functionality */}
    </div>
  )
}

export default ${componentName}
`
  }

  private static generatePageTemplate(title: string, description: string): string {
    const pageName = title.replace(/[^a-zA-Z0-9]/g, '').replace(/^./, str => str.toUpperCase())
    
    return `import React from 'react'
import { NextPage } from 'next'

/**
 * ${title} Page
 * ${description}
 */
const ${pageName}Page: NextPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">${title}</h1>
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-700 mb-4">
          ${description}
        </p>
        {/* TODO: Implement page content */}
      </div>
    </div>
  )
}

export default ${pageName}Page
`
  }

  private static generateBugFixTemplate(title: string, description: string): string {
    return `/**
 * Bug Fix: ${title}
 * Description: ${description}
 * Generated: ${new Date().toISOString()}
 */

// TODO: Implement bug fix
// 1. Identify the root cause
// 2. Implement the fix
// 3. Add tests to prevent regression
// 4. Update documentation if needed

export const bugFix = {
  title: '${title}',
  description: '${description}',
  status: 'pending',
  
  // Implement fix logic here
  apply: () => {
    console.log('Applying bug fix for: ${title}')
    // TODO: Add fix implementation
  }
}
`
  }

  private static generateGeneralTemplate(title: string, description: string): string {
    return `/**
 * Implementation: ${title}
 * Description: ${description}
 * Generated: ${new Date().toISOString()}
 */

// TODO: Implement the requested improvement
// Review the feedback and implement appropriate changes

export const improvement = {
  title: '${title}',
  description: '${description}',
  status: 'pending',
  
  // Implement improvement logic here
  apply: () => {
    console.log('Applying improvement: ${title}')
    // TODO: Add implementation
  }
}
`
  }

  private static inferTechStack(githubRepo: string): string[] {
    // Basic tech stack inference based on common patterns
    const repoName = githubRepo.toLowerCase()
    const techStack: string[] = []
    
    if (repoName.includes('next') || repoName.includes('react')) {
      techStack.push('Next.js', 'React', 'TypeScript')
    }
    
    if (repoName.includes('vue')) {
      techStack.push('Vue.js', 'TypeScript')
    }
    
    if (repoName.includes('angular')) {
      techStack.push('Angular', 'TypeScript')
    }
    
    if (repoName.includes('node')) {
      techStack.push('Node.js', 'TypeScript')
    }
    
    // Default to common web stack
    if (techStack.length === 0) {
      techStack.push('JavaScript', 'HTML', 'CSS')
    }
    
    return techStack
  }

  private static estimateComplexity(files: Array<{ path: string; content: string; action: string }>): 'LOW' | 'MEDIUM' | 'HIGH' {
    const fileCount = files.length
    const totalLines = files.reduce((sum, file) => sum + file.content.split('\n').length, 0)
    
    if (fileCount <= 2 && totalLines <= 100) {
      return 'LOW'
    } else if (fileCount <= 5 && totalLines <= 500) {
      return 'MEDIUM'
    } else {
      return 'HIGH'
    }
  }

  static async reviewGeneratedCode(
    files: Array<{ path: string; content: string; action: string }>,
    context: string
  ): Promise<{
    overallRating: number
    issues: Array<{ type: string; message: string; file?: string }>
    suggestions: string[]
  }> {
    try {
      const allCode = files.map(f => `// File: ${f.path}\n${f.content}`).join('\n\n')
      
      const review = await retryWithBackoff(async () => {
        return withRateLimit('claude', async () => {
          return claudeClient.reviewCode(allCode, context)
        })
      })

      return {
        overallRating: review.overallRating,
        issues: review.issues,
        suggestions: review.suggestions
      }

    } catch (error) {
      console.error('Error reviewing generated code:', error)
      return {
        overallRating: 5,
        issues: [],
        suggestions: ['Manual code review recommended']
      }
    }
  }
}
