import Anthropic from '@anthropic-ai/sdk'
import { config } from '@/lib/config'

class ClaudeClient {
  private client: Anthropic

  constructor() {
    this.client = new Anthropic({
      apiKey: config.ANTHROPIC_API_KEY,
    })
  }

  async generateCode(prompt: string, maxTokens: number = 4000): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: maxTokens,
        temperature: 0.1, // Low temperature for more consistent code generation
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })

      if (response.content[0].type === 'text') {
        return response.content[0].text
      } else {
        throw new Error('Unexpected response format from Claude')
      }

    } catch (error) {
      console.error('Claude API error:', error)
      throw new Error('Failed to generate code with Claude')
    }
  }

  async generateImplementation(
    feedbackTitle: string,
    feedbackDescription: string,
    category: string,
    implementationPlan: string,
    projectContext: {
      name: string
      description?: string
      githubRepo: string
      techStack?: string[]
      existingFiles?: string[]
    }
  ): Promise<{
    files: Array<{
      path: string
      content: string
      action: 'create' | 'modify' | 'delete'
    }>
    commitMessage: string
    branchName: string
    prTitle: string
    prDescription: string
    rawResponse: string
  }> {
    const prompt = `
You are an expert software developer tasked with implementing a feature/fix based on user feedback.

Project Context:
- Name: ${projectContext.name}
- Description: ${projectContext.description || 'No description provided'}
- Repository: ${projectContext.githubRepo}
- Tech Stack: ${projectContext.techStack?.join(', ') || 'Not specified'}

Feedback Details:
- Title: ${feedbackTitle}
- Description: ${feedbackDescription}
- Category: ${category}

Implementation Plan:
${implementationPlan}

Please provide a complete implementation that includes:

1. **Files to create/modify** - Provide the complete file content for each file
2. **Commit message** - A clear, descriptive commit message
3. **Branch name** - A descriptive branch name following git conventions
4. **Pull request details** - Title and description for the PR

Guidelines:
- Follow best practices for the technology stack
- Include proper error handling
- Add appropriate comments
- Ensure code is production-ready
- Follow existing code patterns if possible
- Include tests if applicable

Respond in the following JSON format:
{
  "files": [
    {
      "path": "relative/path/to/file.ext",
      "content": "complete file content here",
      "action": "create|modify|delete"
    }
  ],
  "commitMessage": "descriptive commit message",
  "branchName": "feature/descriptive-branch-name",
  "prTitle": "Clear PR title",
  "prDescription": "Detailed PR description explaining the changes"
}

Important: 
- Provide complete, working code
- Don't use placeholders or TODO comments
- Ensure all imports and dependencies are correct
- Make the code ready for immediate use
`

    try {
      const response = await this.generateCode(prompt, 4000)
      
      // Try to parse the JSON response
      try {
        const parsed = JSON.parse(response)
        
        // Validate the response structure
        if (!parsed.files || !Array.isArray(parsed.files)) {
          throw new Error('Invalid response: files array is required')
        }
        
        if (!parsed.commitMessage || !parsed.branchName) {
          throw new Error('Invalid response: commitMessage and branchName are required')
        }

        // Ensure each file has required properties
        for (const file of parsed.files) {
          if (!file.path || !file.content || !file.action) {
            throw new Error('Invalid file object: path, content, and action are required')
          }
          if (!['create', 'modify', 'delete'].includes(file.action)) {
            throw new Error('Invalid file action: must be create, modify, or delete')
          }
        }

        return {
          files: parsed.files,
          commitMessage: parsed.commitMessage,
          branchName: parsed.branchName,
          prTitle: parsed.prTitle || feedbackTitle,
          prDescription: parsed.prDescription || `Implementation for: ${feedbackTitle}`,
          rawResponse: response
        }

      } catch (parseError) {
        console.error('Failed to parse Claude response as JSON:', parseError)
        
        // Fallback: try to extract code blocks from the response
        const codeBlocks = this.extractCodeBlocks(response)
        
        return {
          files: codeBlocks.map((block, index) => ({
            path: block.filename || `generated-file-${index + 1}.${block.language || 'txt'}`,
            content: block.content,
            action: 'create' as const
          })),
          commitMessage: `Implement: ${feedbackTitle}`,
          branchName: `feature/${feedbackTitle.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 50)}`,
          prTitle: `Implement: ${feedbackTitle}`,
          prDescription: `Implementation for feedback: ${feedbackDescription}`,
          rawResponse: response
        }
      }

    } catch (error) {
      console.error('Error generating implementation with Claude:', error)
      throw error
    }
  }

  private extractCodeBlocks(text: string): Array<{
    content: string
    language?: string
    filename?: string
  }> {
    const codeBlockRegex = /```(\w+)?\s*(?:\/\/\s*(.+?))?\n([\s\S]*?)```/g
    const blocks: Array<{ content: string; language?: string; filename?: string }> = []
    
    let match
    while ((match = codeBlockRegex.exec(text)) !== null) {
      blocks.push({
        language: match[1],
        filename: match[2],
        content: match[3].trim()
      })
    }
    
    return blocks
  }

  async reviewCode(
    code: string,
    context: string
  ): Promise<{
    issues: Array<{
      type: 'error' | 'warning' | 'suggestion'
      message: string
      line?: number
    }>
    suggestions: string[]
    overallRating: number // 1-10
  }> {
    const prompt = `
Please review the following code and provide feedback:

Context: ${context}

Code:
\`\`\`
${code}
\`\`\`

Please analyze the code for:
1. Syntax errors
2. Logic issues
3. Best practices
4. Security concerns
5. Performance issues
6. Code style and readability

Respond in JSON format:
{
  "issues": [
    {
      "type": "error|warning|suggestion",
      "message": "description of the issue",
      "line": 5
    }
  ],
  "suggestions": ["general improvement suggestions"],
  "overallRating": 8
}
`

    try {
      const response = await this.generateCode(prompt, 2000)
      const parsed = JSON.parse(response)
      
      return {
        issues: parsed.issues || [],
        suggestions: parsed.suggestions || [],
        overallRating: parsed.overallRating || 5
      }

    } catch (error) {
      console.error('Error reviewing code with Claude:', error)
      return {
        issues: [],
        suggestions: ['Code review failed - manual review recommended'],
        overallRating: 5
      }
    }
  }

  async explainCode(code: string, context?: string): Promise<string> {
    const prompt = `
Please explain the following code in simple terms:

${context ? `Context: ${context}` : ''}

Code:
\`\`\`
${code}
\`\`\`

Provide a clear explanation of:
1. What the code does
2. How it works
3. Key components and their purpose
4. Any important patterns or techniques used
`

    try {
      return await this.generateCode(prompt, 1500)
    } catch (error) {
      console.error('Error explaining code with Claude:', error)
      return 'Unable to generate code explanation at this time.'
    }
  }
}

export const claudeClient = new ClaudeClient()
