import { 
  categorizeByKeywords, 
  isImplementable, 
  validateAnalysisResult,
  FEEDBACK_CATEGORIES,
  PRIORITY_LEVELS,
  SENTIMENT_TYPES
} from '../categorization'

describe('Categorization Utils', () => {
  describe('categorizeByKeywords', () => {
    it('should categorize bug reports correctly', () => {
      const text = 'The login button is broken and crashes the app when clicked'
      const result = categorizeByKeywords(text)
      
      expect(result.suggestedCategory).toBe(FEEDBACK_CATEGORIES.BUG_REPORT)
      expect(result.suggestedPriority).toBe(PRIORITY_LEVELS.HIGH)
      expect(result.suggestedSentiment).toBe(SENTIMENT_TYPES.NEGATIVE)
      expect(result.confidence).toBeGreaterThan(0)
    })

    it('should categorize feature requests correctly', () => {
      const text = 'Please add a dark mode feature to the application'
      const result = categorizeByKeywords(text)
      
      expect(result.suggestedCategory).toBe(FEEDBACK_CATEGORIES.FEATURE_REQUEST)
      expect(result.suggestedSentiment).toBe(SENTIMENT_TYPES.NEUTRAL)
    })

    it('should categorize UI/UX improvements correctly', () => {
      const text = 'The user interface is confusing and hard to navigate'
      const result = categorizeByKeywords(text)
      
      expect(result.suggestedCategory).toBe(FEEDBACK_CATEGORIES.UI_UX_IMPROVEMENT)
      expect(result.suggestedSentiment).toBe(SENTIMENT_TYPES.NEGATIVE)
    })

    it('should categorize performance issues correctly', () => {
      const text = 'The page loading is very slow and takes too long'
      const result = categorizeByKeywords(text)
      
      expect(result.suggestedCategory).toBe(FEEDBACK_CATEGORIES.PERFORMANCE_ISSUE)
      expect(result.suggestedSentiment).toBe(SENTIMENT_TYPES.NEGATIVE)
    })

    it('should handle positive feedback', () => {
      const text = 'I love this feature, it works great and is amazing'
      const result = categorizeByKeywords(text)
      
      expect(result.suggestedSentiment).toBe(SENTIMENT_TYPES.POSITIVE)
    })

    it('should handle neutral feedback', () => {
      const text = 'I suggest considering adding a new feature for better workflow'
      const result = categorizeByKeywords(text)
      
      expect(result.suggestedSentiment).toBe(SENTIMENT_TYPES.NEUTRAL)
    })

    it('should assign default values for unclear text', () => {
      const text = 'Some random text without clear indicators'
      const result = categorizeByKeywords(text)
      
      expect(result.suggestedCategory).toBe(FEEDBACK_CATEGORIES.GENERAL)
      expect(result.suggestedPriority).toBe(PRIORITY_LEVELS.MEDIUM)
      expect(result.suggestedSentiment).toBe(SENTIMENT_TYPES.NEUTRAL)
    })
  })

  describe('isImplementable', () => {
    it('should mark bug reports as implementable', () => {
      const result = isImplementable(FEEDBACK_CATEGORIES.BUG_REPORT, 'Fix the login issue')
      expect(result).toBe(true)
    })

    it('should mark feature requests as implementable', () => {
      const result = isImplementable(FEEDBACK_CATEGORIES.FEATURE_REQUEST, 'Add dark mode')
      expect(result).toBe(true)
    })

    it('should mark specific requests as implementable', () => {
      const result = isImplementable(FEEDBACK_CATEGORIES.GENERAL, 'Please add a new button to the header')
      expect(result).toBe(true)
    })

    it('should mark vague requests as not implementable', () => {
      const result = isImplementable(FEEDBACK_CATEGORIES.GENERAL, 'Maybe somehow improve the overall experience')
      expect(result).toBe(false)
    })

    it('should handle action words correctly', () => {
      const result = isImplementable(FEEDBACK_CATEGORIES.GENERAL, 'Remove the unnecessary popup')
      expect(result).toBe(true)
    })

    it('should handle uncertain language', () => {
      const result = isImplementable(FEEDBACK_CATEGORIES.GENERAL, 'Not sure if this could be better')
      expect(result).toBe(false)
    })
  })

  describe('validateAnalysisResult', () => {
    it('should validate correct analysis result', () => {
      const validResult = {
        category: 'Bug Report',
        priority: 'HIGH',
        sentiment: 'NEGATIVE',
        isImplementable: true
      }
      
      const validation = validateAnalysisResult(validResult)
      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should reject missing category', () => {
      const invalidResult = {
        priority: 'HIGH',
        sentiment: 'NEGATIVE',
        isImplementable: true
      }
      
      const validation = validateAnalysisResult(invalidResult)
      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('Category is required and must be a string')
    })

    it('should reject invalid priority', () => {
      const invalidResult = {
        category: 'Bug Report',
        priority: 'INVALID',
        sentiment: 'NEGATIVE',
        isImplementable: true
      }
      
      const validation = validateAnalysisResult(invalidResult)
      expect(validation.isValid).toBe(false)
      expect(validation.errors[0]).toContain('Priority must be one of')
    })

    it('should reject invalid sentiment', () => {
      const invalidResult = {
        category: 'Bug Report',
        priority: 'HIGH',
        sentiment: 'INVALID',
        isImplementable: true
      }
      
      const validation = validateAnalysisResult(invalidResult)
      expect(validation.isValid).toBe(false)
      expect(validation.errors[0]).toContain('Sentiment must be one of')
    })

    it('should reject non-boolean isImplementable', () => {
      const invalidResult = {
        category: 'Bug Report',
        priority: 'HIGH',
        sentiment: 'NEGATIVE',
        isImplementable: 'yes'
      }
      
      const validation = validateAnalysisResult(invalidResult)
      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('isImplementable must be a boolean')
    })
  })
})
