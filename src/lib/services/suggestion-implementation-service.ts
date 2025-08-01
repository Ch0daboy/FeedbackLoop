import { FeedbackAnalysisService } from './feedback-analysis-service'
import { CodeGenerationService } from './code-generation-service'
import { FeedbackService } from './feedback-service'
import { AnalysisService } from './analysis-service'

export interface SuggestionImplementationResult {
  feedbackId: string
  analysisResult: {
    category: string
    priority: string
    sentiment: string
    isImplementable: boolean
  }
  codeGeneration: {
    files: Array<{
      path: string
      content: string
      action: 'create' | 'modify' | 'delete'
    }>
    commitMessage: string
    branchName: string
    prTitle: string
    prDescription: string
  }
  implementationPlan: {
    plan: string
    estimatedComplexity: 'LOW' | 'MEDIUM' | 'HIGH'
    suggestedFiles: string[]
    technicalApproach: string
  }
  status: 'completed' | 'partial' | 'failed'
  errors: string[]
}

export class SuggestionImplementationService {
  static async processUserSuggestion(feedbackId: string): Promise<SuggestionImplementationResult> {
    const errors: string[] = []
    let status: 'completed' | 'partial' | 'failed' = 'completed'

    try {
      // Step 1: Analyze the feedback
      console.log(`Processing suggestion for feedback: ${feedbackId}`)
      
      let analysisResult
      try {
        analysisResult = await FeedbackAnalysisService.analyzeFeedback(feedbackId)
        console.log(`Analysis completed for feedback: ${feedbackId}`)
      } catch (error) {
        errors.push(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        status = 'failed'
        throw new Error('Failed to analyze feedback')
      }

      // Step 2: Check if implementable
      if (!analysisResult.isImplementable) {
        return {
          feedbackId,
          analysisResult: {
            category: analysisResult.category,
            priority: analysisResult.priority,
            sentiment: analysisResult.sentiment,
            isImplementable: analysisResult.isImplementable
          },
          codeGeneration: {
            files: [],
            commitMessage: '',
            branchName: '',
            prTitle: '',
            prDescription: ''
          },
          implementationPlan: {
            plan: 'Feedback is not implementable',
            estimatedComplexity: 'LOW',
            suggestedFiles: [],
            technicalApproach: 'No implementation required'
          },
          status: 'completed',
          errors: ['Feedback is not marked as implementable']
        }
      }

      // Step 3: Generate implementation plan
      let implementationPlan
      try {
        implementationPlan = await FeedbackAnalysisService.generateImplementationPlan(feedbackId)
        console.log(`Implementation plan generated for feedback: ${feedbackId}`)
      } catch (error) {
        errors.push(`Implementation plan generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        status = 'partial'
        
        // Use fallback plan
        implementationPlan = {
          plan: 'Manual implementation required',
          estimatedComplexity: 'MEDIUM' as const,
          suggestedFiles: [],
          technicalApproach: 'Standard implementation approach'
        }
      }

      // Step 4: Generate code
      let codeGeneration
      try {
        const codeResult = await CodeGenerationService.generateImplementation(feedbackId)
        codeGeneration = {
          files: codeResult.files,
          commitMessage: codeResult.commitMessage,
          branchName: codeResult.branchName,
          prTitle: codeResult.prTitle,
          prDescription: codeResult.prDescription
        }
        console.log(`Code generation completed for feedback: ${feedbackId}`)
      } catch (error) {
        errors.push(`Code generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        status = 'partial'
        
        // Use fallback code generation
        codeGeneration = {
          files: [{
            path: 'TODO.md',
            content: `# Implementation Required\n\nFeedback: ${analysisResult.category}\nPlan: ${implementationPlan.plan}\n\nManual implementation required.`,
            action: 'create' as const
          }],
          commitMessage: `TODO: Implement feedback`,
          branchName: `feature/manual-implementation`,
          prTitle: `Manual Implementation Required`,
          prDescription: `This feedback requires manual implementation.`
        }
      }

      return {
        feedbackId,
        analysisResult: {
          category: analysisResult.category,
          priority: analysisResult.priority,
          sentiment: analysisResult.sentiment,
          isImplementable: analysisResult.isImplementable
        },
        codeGeneration,
        implementationPlan,
        status,
        errors
      }

    } catch (error) {
      console.error('Error processing user suggestion:', error)
      
      return {
        feedbackId,
        analysisResult: {
          category: 'Unknown',
          priority: 'MEDIUM',
          sentiment: 'NEUTRAL',
          isImplementable: false
        },
        codeGeneration: {
          files: [],
          commitMessage: '',
          branchName: '',
          prTitle: '',
          prDescription: ''
        },
        implementationPlan: {
          plan: 'Processing failed',
          estimatedComplexity: 'HIGH',
          suggestedFiles: [],
          technicalApproach: 'Manual review required'
        },
        status: 'failed',
        errors: [...errors, error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  static async batchProcessSuggestions(feedbackIds: string[]): Promise<SuggestionImplementationResult[]> {
    const results: SuggestionImplementationResult[] = []
    
    console.log(`Processing ${feedbackIds.length} suggestions in batch`)

    for (const feedbackId of feedbackIds) {
      try {
        const result = await this.processUserSuggestion(feedbackId)
        results.push(result)
        
        // Small delay between processing to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 2000))
        
      } catch (error) {
        console.error(`Failed to process suggestion ${feedbackId}:`, error)
        results.push({
          feedbackId,
          analysisResult: {
            category: 'Unknown',
            priority: 'MEDIUM',
            sentiment: 'NEUTRAL',
            isImplementable: false
          },
          codeGeneration: {
            files: [],
            commitMessage: '',
            branchName: '',
            prTitle: '',
            prDescription: ''
          },
          implementationPlan: {
            plan: 'Processing failed',
            estimatedComplexity: 'HIGH',
            suggestedFiles: [],
            technicalApproach: 'Manual review required'
          },
          status: 'failed',
          errors: [error instanceof Error ? error.message : 'Unknown error']
        })
      }
    }

    return results
  }

  static async getImplementablesuggestions(): Promise<Array<{
    feedbackId: string
    title: string
    category: string
    priority: string
    isImplementable: boolean
  }>> {
    try {
      const implementableFeedback = await AnalysisService.getImplementableFeedback()
      
      return implementableFeedback.map(analysis => ({
        feedbackId: analysis.feedbackId,
        title: analysis.feedback.title,
        category: analysis.extractedCategory || 'General',
        priority: analysis.extractedPriority || 'MEDIUM',
        isImplementable: analysis.isImplementable
      }))

    } catch (error) {
      console.error('Error getting implementable suggestions:', error)
      return []
    }
  }

  static async validateSuggestion(feedbackId: string): Promise<{
    isValid: boolean
    issues: string[]
    recommendations: string[]
  }> {
    try {
      const feedback = await FeedbackService.getFeedbackById(feedbackId)
      if (!feedback) {
        return {
          isValid: false,
          issues: ['Feedback not found'],
          recommendations: []
        }
      }

      const issues: string[] = []
      const recommendations: string[] = []

      // Check if feedback has sufficient detail
      if (feedback.title.length < 10) {
        issues.push('Title is too short - should be at least 10 characters')
      }

      if (feedback.description.length < 20) {
        issues.push('Description is too short - should be at least 20 characters')
      }

      // Check if feedback is specific enough
      const vagueWords = ['somehow', 'maybe', 'perhaps', 'not sure', 'unclear']
      const hasVagueLanguage = vagueWords.some(word => 
        feedback.description.toLowerCase().includes(word)
      )

      if (hasVagueLanguage) {
        issues.push('Feedback contains vague language that may be difficult to implement')
        recommendations.push('Provide more specific details about the desired changes')
      }

      // Check if feedback is actionable
      const actionWords = ['add', 'remove', 'change', 'fix', 'update', 'create', 'delete']
      const hasActionWords = actionWords.some(word => 
        feedback.description.toLowerCase().includes(word)
      )

      if (!hasActionWords) {
        recommendations.push('Include specific actions or changes you would like to see')
      }

      return {
        isValid: issues.length === 0,
        issues,
        recommendations
      }

    } catch (error) {
      console.error('Error validating suggestion:', error)
      return {
        isValid: false,
        issues: ['Validation failed'],
        recommendations: ['Manual review required']
      }
    }
  }
}
