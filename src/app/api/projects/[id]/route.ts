import { NextRequest, NextResponse } from 'next/server'
import { ProjectService } from '@/lib/services/project-service'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const projectId = params.id
    
    // Get project details
    const project = await ProjectService.getProjectById(projectId)
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Return public project information (no sensitive data)
    return NextResponse.json({
      id: project.id,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
      feedbackCount: project._count?.feedback || 0
    })

  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
