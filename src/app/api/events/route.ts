import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Store active connections
const connections = new Map<string, ReadableStreamDefaultController>()

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const feedbackId = searchParams.get('feedbackId')
  
  if (!feedbackId) {
    return new Response('feedbackId parameter is required', { status: 400 })
  }

  // Create a unique connection ID
  const connectionId = `${session.user.id}-${feedbackId}-${Date.now()}`

  const stream = new ReadableStream({
    start(controller) {
      // Store the connection
      connections.set(connectionId, controller)
      
      // Send initial connection message
      controller.enqueue(`data: ${JSON.stringify({
        type: 'connected',
        feedbackId,
        timestamp: new Date().toISOString()
      })}\n\n`)

      // Send periodic heartbeat
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(`data: ${JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString()
          })}\n\n`)
        } catch (error) {
          clearInterval(heartbeat)
          connections.delete(connectionId)
        }
      }, 30000) // Every 30 seconds

      // Clean up on close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        connections.delete(connectionId)
        try {
          controller.close()
        } catch (error) {
          // Connection already closed
        }
      })
    },
    
    cancel() {
      connections.delete(connectionId)
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  })
}

// Function to broadcast updates to all connected clients
export function broadcastUpdate(feedbackId: string, update: any) {
  const message = `data: ${JSON.stringify({
    type: 'update',
    feedbackId,
    update,
    timestamp: new Date().toISOString()
  })}\n\n`

  // Send to all connections for this feedback
  for (const [connectionId, controller] of connections.entries()) {
    if (connectionId.includes(feedbackId)) {
      try {
        controller.enqueue(message)
      } catch (error) {
        // Connection closed, remove it
        connections.delete(connectionId)
      }
    }
  }
}

// Function to broadcast status changes
export function broadcastStatusChange(feedbackId: string, status: string, details?: any) {
  broadcastUpdate(feedbackId, {
    type: 'status_change',
    status,
    details
  })
}

// Function to broadcast analysis completion
export function broadcastAnalysisComplete(feedbackId: string, analysis: any) {
  broadcastUpdate(feedbackId, {
    type: 'analysis_complete',
    analysis
  })
}

// Function to broadcast implementation progress
export function broadcastImplementationProgress(feedbackId: string, step: string, progress: number) {
  broadcastUpdate(feedbackId, {
    type: 'implementation_progress',
    step,
    progress
  })
}
