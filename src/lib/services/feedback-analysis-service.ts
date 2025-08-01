import { geminiClient } from '@/lib/ai/gemini-client'
import { AnalysisService } from './analysis-service'
import { FeedbackService } from './feedback-service'
import { ProjectService } from './project-service'
import { FallbackCategorizationService } from './fallback-categorization'
import { handleAIError, retryWithBackoff } from '@/lib/ai/error-handling'
import { withRateLimit } from '@/lib/ai/rate-limiter'

export interface FeedbackAnalysisResult {
  feedbackId: string
  category: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'
  isImplementable: boolean
  implementationSuggestion?: string
  analysisId: string
}

export class FeedbackAnalysisService {
  static async analyzeFeedback(feedbackId: string): Promise<FeedbackAnalysisResult> {
    try {
      // Get feedback details
      const feedback = await FeedbackService.getFeedbackById(feedbackId)
      if (!feedback) {
        throw new Error('Feedback not found')
      }

      // Check if already analyzed
      if (feedback.analysis) {
        return {
          feedbackId: feedback.id,
          category: feedback.analysis.extractedCategory || 'General',
          priority: feedback.analysis.extractedPriority || 'MEDIUM',
          sentiment: feedback.analysis.extractedSentiment || 'NEUTRAL',
          isImplementable: feedback.analysis.isImplementable,
          implementationSuggestion: feedback.analysis.implementationSuggestion || undefined,
          analysisId: feedback.analysis.id
        }
      }

      // Update feedback status to analyzing
      await FeedbackService.updateFeedbackStatus(feedbackId, 'ANALYZING')

      // Get project context for better analysis
      const project = await ProjectService.getProjectById(feedback.projectId)
      const projectContext = project ? 
        `Project: ${project.name}${project.description ? ` - ${project.description}` : ''}` : 
        undefined

      // Analyze with Gemini using rate limiting and retry logic
      const analysisResult = await retryWithBackoff(async () => {
        return withRateLimit('gemini', async () => {
          return geminiClient.analyzeFeedback(
            feedback.title,
            feedback.description,
            projectContext
          )
        })
      })

      // Save analysis results
      const analysis = await AnalysisService.createAnalysis({
        feedbackId: feedback.id,
        geminiResponse: analysisResult.rawResponse,
        extractedCategory: analysisResult.category,
        extractedPriority: analysisResult.priority,
        extractedSentiment: analysisResult.sentiment,
        isImplementable: analysisResult.isImplementable,
        implementationSuggestion: analysisResult.implementationSuggestion,
      })

      return {
        feedbackId: feedback.id,
        category: analysisResult.category,
        priority: analysisResult.priority,
        sentiment: analysisResult.sentiment,
        isImplementable: analysisResult.isImplementable,
        implementationSuggestion: analysisResult.implementationSuggestion,
        analysisId: analysis.id
      }

    } catch (error) {
      console.error('Error analyzing feedback with AI:', error)

      // Try fallback categorization
      try {
        console.log('Attempting fallback categorization for feedback:', feedbackId)
        const fallbackResult = await FallbackCategorizationService.analyzeFeedbackWithKeywords(feedbackId)

        // Save fallback analysis
        const analysis = await AnalysisService.createAnalysis({
          feedbackId: feedback.id,
          geminiResponse: JSON.stringify({
            method: 'keyword-based-fallback',
            confidence: fallbackResult.confidence,
            originalError: error.message,
            result: fallbackResult
          }),
          extractedCategory: fallbackResult.category,
          extractedPriority: fallbackResult.priority,
          extractedSentiment: fallbackResult.sentiment,
          isImplementable: fallbackResult.isImplementable,
          implementationSuggestion: fallbackResult.implementationSuggestion,
        })

        console.log('Fallback categorization successful for feedback:', feedbackId)

        return {
          feedbackId: feedback.id,
          category: fallbackResult.category,
          priority: fallbackResult.priority,
          sentiment: fallbackResult.sentiment,
          isImplementable: fallbackResult.isImplementable,
          implementationSuggestion: fallbackResult.implementationSuggestion,
          analysisId: analysis.id
        }

      } catch (fallbackError) {
        console.error('Fallback categorization also failed:', fallbackError)

        // Update feedback status back to pending on complete failure
        await FeedbackService.updateFeedbackStatus(feedbackId, 'PENDING')

        const aiError = handleAIError(error, 'gemini')
        throw aiError
      }
    }
  }

  static async analyzePendingFeedback(): Promise<FeedbackAnalysisResult[]> {
    try {
      // Get pending feedback
      const pendingFeedback = await FeedbackService.getFeedbackForAnalysis()
      
      if (pendingFeedback.length === 0) {
        return []
      }

      console.log(`Analyzing ${pendingFeedback.length} pending feedback items`)

      const results: FeedbackAnalysisResult[] = []

      // Process feedback one by one to respect rate limits
      for (const feedback of pendingFeedback) {
        try {
          const result = await this.analyzeFeedback(feedback.id)
          results.push(result)
          
          // Small delay between requests to be respectful
          await new Promise(resolve => setTimeout(resolve, 1000))
          
        } catch (error) {
          console.error(`Failed to analyze feedback ${feedback.id}:`, error)
          // Continue with next feedback item
        }
      }

      return results

    } catch (error) {
      console.error('Error in batch feedback analysis:', error)
      throw error
    }
  }

  static async reanalyzeFeedback(feedbackId: string): Promise<FeedbackAnalysisResult> {
    try {
      // Delete existing analysis if it exists
      const existingAnalysis = await AnalysisService.getAnalysisByFeedbackId(feedbackId)
      if (existingAnalysis) {
        await AnalysisService.deleteAnalysis(existingAnalysis.id)
      }

      // Reset feedback status
      await FeedbackService.updateFeedbackStatus(feedbackId, 'PENDING')

      // Analyze again
      return this.analyzeFeedback(feedbackId)

    } catch (error) {
      console.error('Error reanalyzing feedback:', error)
      throw error
    }
  }

  static async generateImplementationPlan(feedbackId: string): Promise<{
    plan: string
    estimatedComplexity: 'LOW' | 'MEDIUM' | 'HIGH'
    suggestedFiles: string[]
    technicalApproach: string
  }> {
    try {
      const feedback = await FeedbackService.getFeedbackById(feedbackId)
      if (!feedback) {
        throw new Error('Feedback not found')
      }

      if (!feedback.analysis) {
        throw new Error('Feedback must be analyzed before generating implementation plan')
      }

      if (!feedback.analysis.isImplementable) {
        throw new Error('Feedback is not marked as implementable')
      }

      // Get project context
      const project = await ProjectService.getProjectById(feedback.projectId)
      const projectContext = project ? 
        `Project: ${project.name}${project.description ? ` - ${project.description}` : ''}. Repository: ${project.githubRepo}` : 
        undefined

      // Generate implementation plan with Gemini
      const planResult = await retryWithBackoff(async () => {
        return withRateLimit('gemini', async () => {
          return geminiClient.generateImplementationPlan(
            feedback.title,
            feedback.description,
            feedback.analysis!.extractedCategory || 'General',
            projectContext
          )
        })
      })

      return {
        plan: planResult.plan,
        estimatedComplexity: planResult.estimatedComplexity,
        suggestedFiles: planResult.suggestedFiles,
        technicalApproach: planResult.technicalApproach
      }

    } catch (error) {
      console.error('Error generating implementation plan:', error)
      const aiError = handleAIError(error, 'gemini')
      throw aiError
    }
  }

  static async getAnalysisStats() {
    return AnalysisService.getAnalysisStats()
  }

  static async getImplementableFeedback() {
    return AnalysisService.getImplementableFeedback()
  }
}
