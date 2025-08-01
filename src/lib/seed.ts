import { db } from './db'

export async function seedDatabase() {
  try {
    console.log('Seeding database...')

    // Create a demo user
    const demoUser = await db.user.upsert({
      where: { email: 'demo@feedbackloop.com' },
      update: {},
      create: {
        email: 'demo@feedbackloop.com',
        name: 'Demo User',
        role: 'ADMIN'
      }
    })

    // Create a demo project
    const demoProject = await db.project.upsert({
      where: { id: 'demo' },
      update: {},
      create: {
        id: 'demo',
        name: 'FeedbackLoop Demo',
        description: 'A demo project to showcase FeedbackLoop capabilities',
        githubRepo: 'https://github.com/demo/feedbackloop-demo',
        ownerId: demoUser.id
      }
    })

    // Create some sample feedback
    const sampleFeedback = [
      {
        title: 'Add dark mode support',
        description: 'It would be great to have a dark mode option for better user experience during night time usage. This could include a toggle in the settings and automatic detection based on system preferences.',
        email: 'user1@example.com',
        projectId: demoProject.id
      },
      {
        title: 'Fix login button not working on mobile',
        description: 'The login button on the mobile version of the site is not responsive. When I tap it, nothing happens. This issue occurs on both iOS Safari and Android Chrome.',
        email: 'user2@example.com',
        projectId: demoProject.id
      },
      {
        title: 'Improve page loading speed',
        description: 'The homepage takes too long to load, especially on slower connections. Consider optimizing images and implementing lazy loading for better performance.',
        email: 'user3@example.com',
        projectId: demoProject.id
      }
    ]

    for (const feedback of sampleFeedback) {
      // Check if feedback already exists
      const existing = await db.feedback.findFirst({
        where: {
          title: feedback.title,
          projectId: feedback.projectId
        }
      })

      if (!existing) {
        await db.feedback.create({
          data: {
            ...feedback,
            status: 'PENDING'
          }
        })
      }
    }

    console.log('Database seeded successfully!')
    
    return {
      demoUser,
      demoProject,
      feedbackCount: sampleFeedback.length
    }

  } catch (error) {
    console.error('Error seeding database:', error)
    throw error
  }
}

// Run seed if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Seeding completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Seeding failed:', error)
      process.exit(1)
    })
}
