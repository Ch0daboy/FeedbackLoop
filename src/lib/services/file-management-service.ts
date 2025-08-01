import { GitHubClient, GitHubRepository, GitHubFile } from '@/lib/github/github-client'
import { ProjectService } from './project-service'

export interface FileOperation {
  path: string
  content: string
  action: 'create' | 'update' | 'delete'
  encoding?: 'utf-8' | 'base64'
}

export interface FileOperationResult {
  path: string
  action: 'create' | 'update' | 'delete'
  success: boolean
  error?: string
  sha?: string
}

export class FileManagementService {
  static async applyFileOperations(
    projectId: string,
    branchName: string,
    operations: FileOperation[],
    commitMessage: string,
    accessToken: string
  ): Promise<{
    success: boolean
    commitSha?: string
    results: FileOperationResult[]
    errors: string[]
  }> {
    try {
      // Get project details
      const project = await ProjectService.getProjectById(projectId)
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

      // Validate operations
      const validationResults = await this.validateFileOperations(
        repository,
        branchName,
        operations,
        client
      )

      const errors: string[] = []
      const results: FileOperationResult[] = []

      // Check for validation errors
      for (const result of validationResults) {
        if (!result.success) {
          errors.push(`${result.path}: ${result.error}`)
          results.push(result)
        }
      }

      // If there are validation errors, don't proceed
      if (errors.length > 0) {
        return {
          success: false,
          results,
          errors
        }
      }

      // Apply the operations
      const commitFiles = operations.map(op => ({
        path: op.path,
        content: op.content,
        action: op.action
      }))

      const commitSha = await client.commitFiles({
        repository,
        branch: branchName,
        files: commitFiles,
        commitMessage
      })

      // Mark all operations as successful
      for (const operation of operations) {
        results.push({
          path: operation.path,
          action: operation.action,
          success: true,
          sha: commitSha
        })
      }

      return {
        success: true,
        commitSha,
        results,
        errors: []
      }

    } catch (error) {
      console.error('Error applying file operations:', error)
      return {
        success: false,
        results: operations.map(op => ({
          path: op.path,
          action: op.action,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })),
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  private static async validateFileOperations(
    repository: GitHubRepository,
    branchName: string,
    operations: FileOperation[],
    client: GitHubClient
  ): Promise<FileOperationResult[]> {
    const results: FileOperationResult[] = []

    for (const operation of operations) {
      try {
        const validation = await this.validateSingleFileOperation(
          repository,
          branchName,
          operation,
          client
        )
        results.push(validation)
      } catch (error) {
        results.push({
          path: operation.path,
          action: operation.action,
          success: false,
          error: error instanceof Error ? error.message : 'Validation failed'
        })
      }
    }

    return results
  }

  private static async validateSingleFileOperation(
    repository: GitHubRepository,
    branchName: string,
    operation: FileOperation,
    client: GitHubClient
  ): Promise<FileOperationResult> {
    const { path, action, content } = operation

    // Validate file path
    if (!this.isValidFilePath(path)) {
      return {
        path,
        action,
        success: false,
        error: 'Invalid file path'
      }
    }

    // Check if file exists
    const existingFile = await client.getFileContent(repository, path, branchName)

    switch (action) {
      case 'create':
        if (existingFile) {
          return {
            path,
            action,
            success: false,
            error: 'File already exists'
          }
        }
        break

      case 'update':
        if (!existingFile) {
          return {
            path,
            action,
            success: false,
            error: 'File does not exist'
          }
        }
        break

      case 'delete':
        if (!existingFile) {
          return {
            path,
            action,
            success: false,
            error: 'File does not exist'
          }
        }
        break
    }

    // Validate content for create/update operations
    if ((action === 'create' || action === 'update') && !content) {
      return {
        path,
        action,
        success: false,
        error: 'Content is required for create/update operations'
      }
    }

    // Check file size (GitHub has a 100MB limit)
    if ((action === 'create' || action === 'update') && content.length > 100 * 1024 * 1024) {
      return {
        path,
        action,
        success: false,
        error: 'File size exceeds GitHub limit (100MB)'
      }
    }

    return {
      path,
      action,
      success: true,
      sha: existingFile?.sha
    }
  }

  private static isValidFilePath(path: string): boolean {
    // Basic file path validation
    if (!path || path.length === 0) {
      return false
    }

    // Check for invalid characters
    const invalidChars = /[<>:"|?*\x00-\x1f]/
    if (invalidChars.test(path)) {
      return false
    }

    // Check for invalid patterns
    if (path.includes('..') || path.startsWith('/') || path.endsWith('/')) {
      return false
    }

    // Check for reserved names (Windows)
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9']
    const fileName = path.split('/').pop()?.split('.')[0]?.toUpperCase()
    if (fileName && reservedNames.includes(fileName)) {
      return false
    }

    return true
  }

  static async getFileContent(
    projectId: string,
    filePath: string,
    branchName: string,
    accessToken: string
  ): Promise<GitHubFile | null> {
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
      return await client.getFileContent(repository, filePath, branchName)

    } catch (error) {
      console.error('Error getting file content:', error)
      return null
    }
  }

  static async listFiles(
    projectId: string,
    directoryPath: string = '',
    branchName?: string,
    accessToken?: string
  ): Promise<Array<{
    path: string
    type: 'file' | 'directory'
    size?: number
    sha?: string
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

      const client = accessToken ? GitHubClient.withUserToken(accessToken) : new GitHubClient()
      
      // This would require implementing directory listing in the GitHub client
      // For now, return empty array
      console.log(`Would list files in ${directoryPath} for project ${projectId}`)
      return []

    } catch (error) {
      console.error('Error listing files:', error)
      return []
    }
  }

  static generateFileOperationsFromCode(
    generatedFiles: Array<{
      path: string
      content: string
      action: 'create' | 'modify' | 'delete'
    }>
  ): FileOperation[] {
    return generatedFiles.map(file => ({
      path: file.path,
      content: file.content,
      action: file.action === 'modify' ? 'update' : file.action,
      encoding: 'utf-8' as const
    }))
  }

  static async previewFileChanges(
    projectId: string,
    branchName: string,
    operations: FileOperation[],
    accessToken: string
  ): Promise<Array<{
    path: string
    action: 'create' | 'update' | 'delete'
    currentContent?: string
    newContent?: string
    diff?: string
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
      const previews = []

      for (const operation of operations) {
        const currentFile = await client.getFileContent(repository, operation.path, branchName)
        
        previews.push({
          path: operation.path,
          action: operation.action,
          currentContent: currentFile?.content,
          newContent: operation.action !== 'delete' ? operation.content : undefined,
          diff: this.generateDiff(currentFile?.content || '', operation.content || '')
        })
      }

      return previews

    } catch (error) {
      console.error('Error previewing file changes:', error)
      return []
    }
  }

  private static generateDiff(oldContent: string, newContent: string): string {
    // Simple diff generation - in a real implementation, you might use a proper diff library
    if (oldContent === newContent) {
      return 'No changes'
    }

    const oldLines = oldContent.split('\n')
    const newLines = newContent.split('\n')
    
    return `Lines changed: ${oldLines.length} -> ${newLines.length}`
  }
}
