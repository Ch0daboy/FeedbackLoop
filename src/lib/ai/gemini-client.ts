import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
import { config } from '@/lib/config'

class GeminiClient {
  private client: GoogleGenerativeAI
  private model: any

  constructor() {
    this.client = new GoogleGenerativeAI(config.GOOGLE_GEMINI_API_KEY)
    this.model = this.client.getGenerativeModel({
      model: 'gemini-1.5-flash',
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    })
  }

  async generateContent(prompt: string): Promise<string> {
    try {
      const result = await this.model.generateContent(prompt)
      const response = await result.response
      return response.text()
    } catch (error) {
      console.error('Gemini API error:', error)
      throw new Error('Failed to generate content with Gemini')
    }
  }

  async generateStructuredContent(prompt: string, schema?: any): Promise<any> {
    try {
      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const text = response.text()
      
      // Try to parse as JSON if schema is provided
      if (schema) {
        try {
          const parsed = JSON.parse(text)
          return parsed
        } catch (parseError) {
          console.warn('Failed to parse Gemini response as JSON:', parseError)
          return { rawText: text }
        }
      }
      
      return text
    } catch (error) {
      console.error('Gemini API error:', error)
      throw new Error('Failed to generate structured content with Gemini')
    }
  }

  async analyzeFeedback(title: string, description: string, projectContext?: string): Promise<{
    category: string
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'
    isImplementable: boolean
    implementationSuggestion?: string
    rawResponse: string
  }> {
    const prompt = `
Analyze the following user feedback for a software project and provide a structured analysis.

Project Context: ${projectContext || 'General software project'}

Feedback Title: ${title}
Feedback Description: ${description}

Please analyze this feedback and respond with a JSON object containing:
1. category: A brief category for this feedback (e.g., "Bug Report", "Feature Request", "UI/UX Improvement", "Performance Issue", "Documentation", etc.)
2. priority: One of "LOW", "MEDIUM", "HIGH", "CRITICAL" based on impact and urgency
3. sentiment: One of "POSITIVE", "NEUTRAL", "NEGATIVE" based on the tone of the feedback
4. isImplementable: Boolean indicating if this is a concrete, actionable suggestion that can be implemented
5. implementationSuggestion: If implementable, provide a brief technical suggestion for implementation (optional)

Consider these factors:
- Bug reports and security issues should generally have higher priority
- Feature requests should be evaluated based on complexity and value
- Vague or unclear feedback should be marked as not implementable
- Positive feedback might still contain implementable suggestions

Respond only with valid JSON:
`

    try {
      const response = await this.generateStructuredContent(prompt)
      
      // Validate and structure the response
      if (typeof response === 'object' && response.category) {
        return {
          category: response.category || 'General',
          priority: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(response.priority) 
            ? response.priority 
            : 'MEDIUM',
          sentiment: ['POSITIVE', 'NEUTRAL', 'NEGATIVE'].includes(response.sentiment)
            ? response.sentiment
            : 'NEUTRAL',
          isImplementable: Boolean(response.isImplementable),
          implementationSuggestion: response.implementationSuggestion || undefined,
          rawResponse: JSON.stringify(response)
        }
      } else {
        // Fallback if JSON parsing failed
        return {
          category: 'General',
          priority: 'MEDIUM',
          sentiment: 'NEUTRAL',
          isImplementable: false,
          rawResponse: typeof response === 'string' ? response : JSON.stringify(response)
        }
      }
    } catch (error) {
      console.error('Error analyzing feedback with Gemini:', error)
      throw error
    }
  }

  async generateImplementationPlan(
    feedbackTitle: string,
    feedbackDescription: string,
    category: string,
    projectContext?: string
  ): Promise<{
    plan: string
    estimatedComplexity: 'LOW' | 'MEDIUM' | 'HIGH'
    suggestedFiles: string[]
    technicalApproach: string
    rawResponse: string
  }> {
    const prompt = `
Create an implementation plan for the following feedback:

Project Context: ${projectContext || 'General software project'}
Category: ${category}
Title: ${feedbackTitle}
Description: ${feedbackDescription}

Please provide a detailed implementation plan as a JSON object with:
1. plan: A step-by-step implementation plan
2. estimatedComplexity: One of "LOW", "MEDIUM", "HIGH"
3. suggestedFiles: Array of file paths that might need to be modified
4. technicalApproach: Brief description of the technical approach

Consider:
- Break down the implementation into clear steps
- Identify which files/components would need changes
- Estimate complexity based on scope and technical requirements
- Provide actionable technical guidance

Respond only with valid JSON:
`

    try {
      const response = await this.generateStructuredContent(prompt)
      
      if (typeof response === 'object' && response.plan) {
        return {
          plan: response.plan || 'No specific plan generated',
          estimatedComplexity: ['LOW', 'MEDIUM', 'HIGH'].includes(response.estimatedComplexity)
            ? response.estimatedComplexity
            : 'MEDIUM',
          suggestedFiles: Array.isArray(response.suggestedFiles) 
            ? response.suggestedFiles 
            : [],
          technicalApproach: response.technicalApproach || 'Standard implementation approach',
          rawResponse: JSON.stringify(response)
        }
      } else {
        return {
          plan: 'Implementation plan could not be generated',
          estimatedComplexity: 'MEDIUM',
          suggestedFiles: [],
          technicalApproach: 'Manual implementation required',
          rawResponse: typeof response === 'string' ? response : JSON.stringify(response)
        }
      }
    } catch (error) {
      console.error('Error generating implementation plan with Gemini:', error)
      throw error
    }
  }
}

export const geminiClient = new GeminiClient()
