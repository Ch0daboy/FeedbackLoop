import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { db } from './db'
import bcrypt from 'bcryptjs'

export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    return null
  }

  const user = await db.user.findUnique({
    where: {
      email: session.user.email
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      createdAt: true,
    }
  })

  return user
}

export async function createUser(data: {
  name: string
  email: string
  password: string
}) {
  const hashedPassword = await bcrypt.hash(data.password, 12)
  
  const user = await db.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      createdAt: true,
    }
  })

  return user
}

export async function verifyPassword(password: string, hashedPassword: string) {
  return bcrypt.compare(password, hashedPassword)
}

export function requireAuth() {
  return async () => {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('Unauthorized')
    }
    return user
  }
}

export function requireRole(role: string) {
  return async () => {
    const user = await getCurrentUser()
    if (!user || user.role !== role) {
      throw new Error('Forbidden')
    }
    return user
  }
}
