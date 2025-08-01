import { Octokit } from '@octokit/rest'
import { config } from '@/lib/config'

export interface GitHubRepository {
  owner: string
  repo: string
}

export interface GitHubFile {
  path: string
  content: string
  sha?: string
  encoding?: 'utf-8' | 'base64'
}

export interface CreateBranchOptions {
  repository: GitHubRepository
  branchName: string
  fromBranch?: string
}

export interface CommitFilesOptions {
  repository: GitHubRepository
  branch: string
  files: Array<{
    path: string
    content: string
    action: 'create' | 'update' | 'delete'
  }>
  commitMessage: string
}

export interface CreatePullRequestOptions {
  repository: GitHubRepository
  title: string
  body: string
  head: string
  base?: string
}

class GitHubClient {
  private octokit: Octokit

  constructor(accessToken?: string) {
    this.octokit = new Octokit({
      auth: accessToken || config.GITHUB_CLIENT_SECRET, // Fallback to app secret
    })
  }

  // Create a new instance with user's access token
  static withUserToken(accessToken: string): GitHubClient {
    return new GitHubClient(accessToken)
  }

  async getRepository(owner: string, repo: string) {
    try {
      const response = await this.octokit.rest.repos.get({
        owner,
        repo,
      })
      return response.data
    } catch (error) {
      console.error('Error fetching repository:', error)
      throw new Error(`Failed to fetch repository ${owner}/${repo}`)
    }
  }

  async getDefaultBranch(repository: GitHubRepository): Promise<string> {
    try {
      const repo = await this.getRepository(repository.owner, repository.repo)
      return repo.default_branch
    } catch (error) {
      console.error('Error getting default branch:', error)
      return 'main' // Fallback
    }
  }

  async createBranch(options: CreateBranchOptions): Promise<void> {
    try {
      const { repository, branchName, fromBranch } = options
      
      // Get the SHA of the branch to create from
      const baseBranch = fromBranch || await this.getDefaultBranch(repository)
      const baseRef = await this.octokit.rest.git.getRef({
        owner: repository.owner,
        repo: repository.repo,
        ref: `heads/${baseBranch}`,
      })

      // Create new branch
      await this.octokit.rest.git.createRef({
        owner: repository.owner,
        repo: repository.repo,
        ref: `refs/heads/${branchName}`,
        sha: baseRef.data.object.sha,
      })

      console.log(`Created branch: ${branchName}`)
    } catch (error) {
      console.error('Error creating branch:', error)
      throw new Error(`Failed to create branch ${options.branchName}`)
    }
  }

  async getFileContent(
    repository: GitHubRepository,
    path: string,
    branch?: string
  ): Promise<GitHubFile | null> {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner: repository.owner,
        repo: repository.repo,
        path,
        ref: branch,
      })

      if ('content' in response.data && response.data.type === 'file') {
        return {
          path,
          content: Buffer.from(response.data.content, 'base64').toString('utf-8'),
          sha: response.data.sha,
          encoding: 'utf-8'
        }
      }

      return null
    } catch (error) {
      if (error instanceof Error && 'status' in error && error.status === 404) {
        return null // File doesn't exist
      }
      console.error('Error getting file content:', error)
      throw new Error(`Failed to get file content for ${path}`)
    }
  }

  async commitFiles(options: CommitFilesOptions): Promise<string> {
    try {
      const { repository, branch, files, commitMessage } = options

      // Get current commit SHA
      const branchRef = await this.octokit.rest.git.getRef({
        owner: repository.owner,
        repo: repository.repo,
        ref: `heads/${branch}`,
      })

      const currentCommitSha = branchRef.data.object.sha

      // Get current tree
      const currentCommit = await this.octokit.rest.git.getCommit({
        owner: repository.owner,
        repo: repository.repo,
        commit_sha: currentCommitSha,
      })

      const currentTreeSha = currentCommit.data.tree.sha

      // Create tree with file changes
      const tree = []
      
      for (const file of files) {
        if (file.action === 'delete') {
          tree.push({
            path: file.path,
            mode: '100644' as const,
            type: 'blob' as const,
            sha: null, // null SHA means delete
          })
        } else {
          // Create blob for file content
          const blob = await this.octokit.rest.git.createBlob({
            owner: repository.owner,
            repo: repository.repo,
            content: file.content,
            encoding: 'utf-8',
          })

          tree.push({
            path: file.path,
            mode: '100644' as const,
            type: 'blob' as const,
            sha: blob.data.sha,
          })
        }
      }

      // Create new tree
      const newTree = await this.octokit.rest.git.createTree({
        owner: repository.owner,
        repo: repository.repo,
        base_tree: currentTreeSha,
        tree,
      })

      // Create commit
      const newCommit = await this.octokit.rest.git.createCommit({
        owner: repository.owner,
        repo: repository.repo,
        message: commitMessage,
        tree: newTree.data.sha,
        parents: [currentCommitSha],
      })

      // Update branch reference
      await this.octokit.rest.git.updateRef({
        owner: repository.owner,
        repo: repository.repo,
        ref: `heads/${branch}`,
        sha: newCommit.data.sha,
      })

      console.log(`Committed ${files.length} files to branch: ${branch}`)
      return newCommit.data.sha

    } catch (error) {
      console.error('Error committing files:', error)
      throw new Error('Failed to commit files to repository')
    }
  }

  async createPullRequest(options: CreatePullRequestOptions): Promise<{
    number: number
    url: string
    html_url: string
  }> {
    try {
      const { repository, title, body, head, base } = options
      
      const baseBranch = base || await this.getDefaultBranch(repository)

      const response = await this.octokit.rest.pulls.create({
        owner: repository.owner,
        repo: repository.repo,
        title,
        body,
        head,
        base: baseBranch,
      })

      console.log(`Created pull request: ${response.data.html_url}`)
      
      return {
        number: response.data.number,
        url: response.data.url,
        html_url: response.data.html_url,
      }

    } catch (error) {
      console.error('Error creating pull request:', error)
      throw new Error('Failed to create pull request')
    }
  }

  async listBranches(repository: GitHubRepository): Promise<string[]> {
    try {
      const response = await this.octokit.rest.repos.listBranches({
        owner: repository.owner,
        repo: repository.repo,
      })

      return response.data.map(branch => branch.name)
    } catch (error) {
      console.error('Error listing branches:', error)
      throw new Error('Failed to list repository branches')
    }
  }

  async branchExists(repository: GitHubRepository, branchName: string): Promise<boolean> {
    try {
      await this.octokit.rest.git.getRef({
        owner: repository.owner,
        repo: repository.repo,
        ref: `heads/${branchName}`,
      })
      return true
    } catch (error) {
      return false
    }
  }

  static parseRepositoryUrl(url: string): GitHubRepository | null {
    // Handle various GitHub URL formats
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/.*)?$/,
      /github\.com:([^\/]+)\/([^\/]+?)(?:\.git)?$/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) {
        return {
          owner: match[1],
          repo: match[2]
        }
      }
    }

    return null
  }
}

export const githubClient = new GitHubClient()

export interface GitHubIntegration {
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  scope: string[]
}

export class GitHubService {
  static async validateRepository(repoUrl: string, accessToken?: string): Promise<{
    isValid: boolean
    repository?: GitHubRepository
    error?: string
  }> {
    try {
      const repository = GitHubClient.parseRepositoryUrl(repoUrl)
      if (!repository) {
        return {
          isValid: false,
          error: 'Invalid GitHub repository URL'
        }
      }

      const client = accessToken ? GitHubClient.withUserToken(accessToken) : githubClient
      await client.getRepository(repository.owner, repository.repo)

      return {
        isValid: true,
        repository
      }
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  static async checkRepositoryAccess(
    repository: GitHubRepository,
    accessToken: string
  ): Promise<{
    hasAccess: boolean
    permissions: {
      read: boolean
      write: boolean
      admin: boolean
    }
  }> {
    try {
      const client = GitHubClient.withUserToken(accessToken)
      const repo = await client.getRepository(repository.owner, repository.repo)

      return {
        hasAccess: true,
        permissions: {
          read: true,
          write: repo.permissions?.push || false,
          admin: repo.permissions?.admin || false
        }
      }
    } catch (error) {
      return {
        hasAccess: false,
        permissions: {
          read: false,
          write: false,
          admin: false
        }
      }
    }
  }
}
