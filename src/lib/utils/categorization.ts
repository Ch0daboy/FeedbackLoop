export const FEEDBACK_CATEGORIES = {
  BUG_REPORT: 'Bug Report',
  FEATURE_REQUEST: 'Feature Request',
  UI_UX_IMPROVEMENT: 'UI/UX Improvement',
  PERFORMANCE_ISSUE: 'Performance Issue',
  SECURITY_CONCERN: 'Security Concern',
  DOCUMENTATION: 'Documentation',
  ACCESSIBILITY: 'Accessibility',
  INTEGRATION: 'Integration',
  CONFIGURATION: 'Configuration',
  GENERAL: 'General'
} as const

export const PRIORITY_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
} as const

export const SENTIMENT_TYPES = {
  POSITIVE: 'POSITIVE',
  NEUTRAL: 'NEUTRAL',
  NEGATIVE: 'NEGATIVE'
} as const

export type FeedbackCategory = typeof FEEDBACK_CATEGORIES[keyof typeof FEEDBACK_CATEGORIES]
export type PriorityLevel = typeof PRIORITY_LEVELS[keyof typeof PRIORITY_LEVELS]
export type SentimentType = typeof SENTIMENT_TYPES[keyof typeof SENTIMENT_TYPES]

// Keywords that help identify different categories
export const CATEGORY_KEYWORDS = {
  [FEEDBACK_CATEGORIES.BUG_REPORT]: [
    'bug', 'error', 'broken', 'crash', 'issue', 'problem', 'fail', 'not working',
    'exception', 'incorrect', 'wrong', 'malfunction', 'glitch', 'defect'
  ],
  [FEEDBACK_CATEGORIES.FEATURE_REQUEST]: [
    'feature', 'add', 'new', 'want', 'need', 'request', 'suggestion', 'enhancement',
    'improvement', 'would like', 'could you', 'please add', 'missing'
  ],
  [FEEDBACK_CATEGORIES.UI_UX_IMPROVEMENT]: [
    'ui', 'ux', 'design', 'interface', 'layout', 'appearance', 'visual', 'styling',
    'user experience', 'usability', 'navigation', 'confusing', 'hard to use'
  ],
  [FEEDBACK_CATEGORIES.PERFORMANCE_ISSUE]: [
    'slow', 'performance', 'speed', 'lag', 'loading', 'timeout', 'optimization',
    'fast', 'quick', 'responsive', 'delay', 'takes too long'
  ],
  [FEEDBACK_CATEGORIES.SECURITY_CONCERN]: [
    'security', 'vulnerability', 'exploit', 'hack', 'breach', 'unsafe', 'privacy',
    'authentication', 'authorization', 'permission', 'access control'
  ],
  [FEEDBACK_CATEGORIES.DOCUMENTATION]: [
    'documentation', 'docs', 'help', 'tutorial', 'guide', 'instructions',
    'unclear', 'confusing', 'explain', 'how to', 'manual'
  ],
  [FEEDBACK_CATEGORIES.ACCESSIBILITY]: [
    'accessibility', 'a11y', 'screen reader', 'keyboard', 'contrast', 'disability',
    'wcag', 'aria', 'alt text', 'focus', 'color blind'
  ]
}

// Priority keywords that help determine urgency
export const PRIORITY_KEYWORDS = {
  [PRIORITY_LEVELS.CRITICAL]: [
    'critical', 'urgent', 'emergency', 'blocking', 'broken', 'crash', 'security',
    'data loss', 'cannot use', 'completely broken', 'production down'
  ],
  [PRIORITY_LEVELS.HIGH]: [
    'important', 'major', 'significant', 'serious', 'affects many', 'workflow',
    'business impact', 'customer facing', 'revenue impact'
  ],
  [PRIORITY_LEVELS.MEDIUM]: [
    'moderate', 'normal', 'standard', 'improvement', 'enhancement', 'nice to have'
  ],
  [PRIORITY_LEVELS.LOW]: [
    'minor', 'small', 'cosmetic', 'polish', 'future', 'eventually', 'low priority',
    'nice to have', 'when possible'
  ]
}

// Sentiment keywords
export const SENTIMENT_KEYWORDS = {
  [SENTIMENT_TYPES.POSITIVE]: [
    'love', 'great', 'awesome', 'excellent', 'amazing', 'fantastic', 'wonderful',
    'perfect', 'brilliant', 'outstanding', 'impressed', 'thank you', 'appreciate'
  ],
  [SENTIMENT_TYPES.NEGATIVE]: [
    'hate', 'terrible', 'awful', 'horrible', 'worst', 'frustrated', 'annoying',
    'disappointed', 'angry', 'useless', 'broken', 'sucks', 'bad'
  ],
  [SENTIMENT_TYPES.NEUTRAL]: [
    'suggest', 'recommend', 'consider', 'maybe', 'could', 'would', 'think',
    'opinion', 'feedback', 'note', 'observation'
  ]
}

export function categorizeByKeywords(text: string): {
  suggestedCategory: FeedbackCategory
  suggestedPriority: PriorityLevel
  suggestedSentiment: SentimentType
  confidence: number
} {
  const lowerText = text.toLowerCase()
  
  // Category detection
  let categoryScores: Record<string, number> = {}
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    categoryScores[category] = keywords.filter(keyword => 
      lowerText.includes(keyword)
    ).length
  }
  
  const suggestedCategory = Object.entries(categoryScores).reduce((a, b) => 
    categoryScores[a[0]] > categoryScores[b[0]] ? a : b
  )[0] as FeedbackCategory || FEEDBACK_CATEGORIES.GENERAL
  
  // Priority detection
  let priorityScores: Record<string, number> = {}
  for (const [priority, keywords] of Object.entries(PRIORITY_KEYWORDS)) {
    priorityScores[priority] = keywords.filter(keyword => 
      lowerText.includes(keyword)
    ).length
  }
  
  const suggestedPriority = Object.entries(priorityScores).reduce((a, b) => 
    priorityScores[a[0]] > priorityScores[b[0]] ? a : b
  )[0] as PriorityLevel || PRIORITY_LEVELS.MEDIUM
  
  // Sentiment detection
  let sentimentScores: Record<string, number> = {}
  for (const [sentiment, keywords] of Object.entries(SENTIMENT_KEYWORDS)) {
    sentimentScores[sentiment] = keywords.filter(keyword => 
      lowerText.includes(keyword)
    ).length
  }
  
  const suggestedSentiment = Object.entries(sentimentScores).reduce((a, b) => 
    sentimentScores[a[0]] > sentimentScores[b[0]] ? a : b
  )[0] as SentimentType || SENTIMENT_TYPES.NEUTRAL
  
  // Calculate confidence based on keyword matches
  const totalMatches = Math.max(
    categoryScores[suggestedCategory],
    priorityScores[suggestedPriority],
    sentimentScores[suggestedSentiment]
  )
  const confidence = Math.min(totalMatches * 0.2, 1.0) // Max confidence of 1.0
  
  return {
    suggestedCategory,
    suggestedPriority,
    suggestedSentiment,
    confidence
  }
}

export function isImplementable(category: FeedbackCategory, text: string): boolean {
  const lowerText = text.toLowerCase()
  
  // Bug reports and feature requests are generally implementable
  if (category === FEEDBACK_CATEGORIES.BUG_REPORT || 
      category === FEEDBACK_CATEGORIES.FEATURE_REQUEST) {
    return true
  }
  
  // Check for specific implementable indicators
  const implementableIndicators = [
    'add', 'remove', 'change', 'fix', 'update', 'modify', 'implement',
    'create', 'delete', 'improve', 'optimize', 'enhance'
  ]
  
  const hasImplementableIndicators = implementableIndicators.some(indicator =>
    lowerText.includes(indicator)
  )
  
  // Check for vague or non-implementable indicators
  const vagueIndicators = [
    'maybe', 'perhaps', 'might', 'could be', 'not sure', 'unclear',
    'general', 'overall', 'in general', 'somehow'
  ]
  
  const hasVagueIndicators = vagueIndicators.some(indicator =>
    lowerText.includes(indicator)
  )
  
  return hasImplementableIndicators && !hasVagueIndicators
}

export function validateAnalysisResult(result: any): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (!result.category || typeof result.category !== 'string') {
    errors.push('Category is required and must be a string')
  }
  
  if (!result.priority || !Object.values(PRIORITY_LEVELS).includes(result.priority)) {
    errors.push('Priority must be one of: LOW, MEDIUM, HIGH, CRITICAL')
  }
  
  if (!result.sentiment || !Object.values(SENTIMENT_TYPES).includes(result.sentiment)) {
    errors.push('Sentiment must be one of: POSITIVE, NEUTRAL, NEGATIVE')
  }
  
  if (typeof result.isImplementable !== 'boolean') {
    errors.push('isImplementable must be a boolean')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}
