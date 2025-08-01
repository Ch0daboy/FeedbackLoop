import { categorizeByKeywords, isImplementable, validateAnalysisResult } from '@/lib/utils/categorization'
import { AnalysisService } from './analysis-service'
import { FeedbackService } from './feedback-service'

export interface FallbackAnalysisResult {
  category: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'
  isImplementable: boolean
  implementationSuggestion?: string
  confidence: number
  method: 'keyword-based'
}

export class FallbackCategorizationService {
  static async analyzeFeedbackWithKeywords(feedbackId: string): Promise<FallbackAnalysisResult> {
    try {
      // Get feedback details
      const feedback = await FeedbackService.getFeedbackById(feedbackId)
      if (!feedback) {
        throw new Error('Feedback not found')
      }

      // Combine title and description for analysis
      const fullText = `${feedback.title} ${feedback.description}`

      // Use keyword-based categorization
      const keywordResult = categorizeByKeywords(fullText)
      
      // Determine if implementable
      const implementable = isImplementable(keywordResult.suggestedCategory, fullText)
      
      // Generate basic implementation suggestion if implementable
      let implementationSuggestion: string | undefined
      if (implementable) {
        implementationSuggestion = this.generateBasicImplementationSuggestion(
          keywordResult.suggestedCategory,
          feedback.title,
          feedback.description
        )
      }

      const result: FallbackAnalysisResult = {
        category: keywordResult.suggestedCategory,
        priority: keywordResult.suggestedPriority,
        sentiment: keywordResult.suggestedSentiment,
        isImplementable: implementable,
        implementationSuggestion,
        confidence: keywordResult.confidence,
        method: 'keyword-based'
      }

      // Validate the result
      const validation = validateAnalysisResult(result)
      if (!validation.isValid) {
        console.warn('Fallback analysis validation failed:', validation.errors)
        // Use safe defaults
        result.category = 'General'
        result.priority = 'MEDIUM'
        result.sentiment = 'NEUTRAL'
        result.confidence = 0.1
      }

      return result

    } catch (error) {
      console.error('Error in fallback categorization:', error)
      throw error
    }
  }

  static async saveKeywordBasedAnalysis(
    feedbackId: string, 
    result: FallbackAnalysisResult
  ): Promise<void> {
    try {
      // Create analysis record with keyword-based results
      await AnalysisService.createAnalysis({
        feedbackId,
        geminiResponse: JSON.stringify({
          method: 'keyword-based',
          confidence: result.confidence,
          result
        }),
        extractedCategory: result.category,
        extractedPriority: result.priority,
        extractedSentiment: result.sentiment,
        isImplementable: result.isImplementable,
        implementationSuggestion: result.implementationSuggestion,
      })

    } catch (error) {
      console.error('Error saving keyword-based analysis:', error)
      throw error
    }
  }

  private static generateBasicImplementationSuggestion(
    category: string,
    title: string,
    description: string
  ): string {
    const lowerTitle = title.toLowerCase()
    const lowerDescription = description.toLowerCase()

    switch (category) {
      case 'Bug Report':
        if (lowerDescription.includes('ui') || lowerDescription.includes('interface')) {
          return 'Review UI components and fix rendering issues. Check CSS styles and component logic.'
        }
        if (lowerDescription.includes('api') || lowerDescription.includes('endpoint')) {
          return 'Debug API endpoint, check request/response handling and error cases.'
        }
        return 'Investigate the reported issue, reproduce the bug, and implement a fix.'

      case 'Feature Request':
        if (lowerDescription.includes('button') || lowerDescription.includes('click')) {
          return 'Add new button component with appropriate event handlers and styling.'
        }
        if (lowerDescription.includes('page') || lowerDescription.includes('screen')) {
          return 'Create new page/screen with required components and routing.'
        }
        return 'Design and implement the requested feature following existing patterns.'

      case 'UI/UX Improvement':
        return 'Update UI components, improve styling, and enhance user experience based on feedback.'

      case 'Performance Issue':
        return 'Profile the application, identify bottlenecks, and optimize performance.'

      case 'Documentation':
        return 'Update or create documentation to address the mentioned concerns.'

      default:
        return 'Review the feedback and implement appropriate changes.'
    }
  }

  static async analyzeWithFallback(feedbackId: string): Promise<{
    success: boolean
    method: 'ai' | 'keyword-based'
    result?: any
    error?: string
  }> {
    try {
      // First try AI analysis (this would be called from the main analysis service)
      // If AI fails, fall back to keyword-based analysis
      
      const keywordResult = await this.analyzeFeedbackWithKeywords(feedbackId)
      await this.saveKeywordBasedAnalysis(feedbackId, keywordResult)

      return {
        success: true,
        method: 'keyword-based',
        result: keywordResult
      }

    } catch (error) {
      console.error('Fallback analysis failed:', error)
      return {
        success: false,
        method: 'keyword-based',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  static getCategorizationStats(): {
    availableCategories: string[]
    priorityLevels: string[]
    sentimentTypes: string[]
    keywordCoverage: Record<string, number>
  } {
    const { FEEDBACK_CATEGORIES, PRIORITY_LEVELS, SENTIMENT_TYPES, CATEGORY_KEYWORDS } = require('@/lib/utils/categorization')
    
    return {
      availableCategories: Object.values(FEEDBACK_CATEGORIES),
      priorityLevels: Object.values(PRIORITY_LEVELS),
      sentimentTypes: Object.values(SENTIMENT_TYPES),
      keywordCoverage: Object.fromEntries(
        Object.entries(CATEGORY_KEYWORDS).map(([category, keywords]) => [
          category,
          (keywords as string[]).length
        ])
      )
    }
  }
}
