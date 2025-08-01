import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export interface CreateUserData {
  name: string
  email: string
  password: string
}

export interface UpdateUserData {
  name?: string
  email?: string
  image?: string
}

export class UserService {
  static async createUser(data: CreateUserData) {
    const hashedPassword = await bcrypt.hash(data.password, 12)
    
    return db.user.create({
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
  }

  static async getUserById(id: string) {
    return db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            projects: true,
            feedback: true,
          }
        }
      }
    })
  }

  static async getUserByEmail(email: string) {
    return db.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        password: true,
        createdAt: true,
      }
    })
  }

  static async updateUser(id: string, data: UpdateUserData) {
    return db.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
      }
    })
  }

  static async deleteUser(id: string) {
    return db.user.delete({
      where: { id }
    })
  }

  static async updatePassword(id: string, newPassword: string) {
    const hashedPassword = await bcrypt.hash(newPassword, 12)
    
    return db.user.update({
      where: { id },
      data: { password: hashedPassword },
      select: {
        id: true,
        email: true,
      }
    })
  }

  static async verifyPassword(email: string, password: string) {
    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
      }
    })

    if (!user || !user.password) {
      return null
    }

    const isValid = await bcrypt.compare(password, user.password)
    
    if (!isValid) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
    }
  }

  static async getUserStats(userId: string) {
    const [
      projectCount,
      feedbackCount,
      recentFeedback,
      implementedCount
    ] = await Promise.all([
      db.project.count({
        where: { ownerId: userId }
      }),
      db.feedback.count({
        where: { userId }
      }),
      db.feedback.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          project: {
            select: {
              id: true,
              name: true,
            }
          }
        }
      }),
      db.feedback.count({
        where: {
          userId,
          status: 'IMPLEMENTED'
        }
      })
    ])

    return {
      projectCount,
      feedbackCount,
      implementedCount,
      recentFeedback,
    }
  }

  static async checkEmailExists(email: string) {
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true }
    })
    
    return !!user
  }
}
