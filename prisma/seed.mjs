import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  // Default plan rows. Prices stay null/Coming Soon until an admin sets them.
  // Keep these defaults in sync with lib/subscriptions/config.ts; the app also
  // fills any missing row at runtime.
  const freeFeatures = {
    whatsappSharing: true,
    customQuestions: false,
    csvImport: false,
    csvExport: false,
    reports: false,
    customBranding: false,
    prioritySupport: false,
  }
  const proFeatures = {
    ...freeFeatures,
    customQuestions: true,
    csvImport: true,
    csvExport: true,
    reports: true,
    customBranding: true,
  }
  const planRows = [
    {
      code: "FREE",
      name: "Free",
      description: "Everything you need to collect RSVPs for one intimate wedding.",
      priceInPaise: null,
      billingPeriodDays: 0,
      features: freeFeatures,
      limits: { weddings: 1, guestsPerWedding: 50, eventsPerWedding: 2, customQuestionsPerWedding: 0 },
      isActive: true,
      sortOrder: 0,
    },
    {
      code: "PRO",
      name: "Pro",
      description: "More weddings, a bigger guest list and rich RSVP collection.",
      priceInPaise: null,
      billingPeriodDays: 30,
      features: proFeatures,
      limits: { weddings: 3, guestsPerWedding: 500, eventsPerWedding: 5, customQuestionsPerWedding: 10 },
      isActive: false,
      sortOrder: 1,
    },
    {
      code: "PRIME",
      name: "Prime",
      description: "Unlimited weddings and guests, every feature, priority support.",
      priceInPaise: null,
      billingPeriodDays: 30,
      features: { ...proFeatures, prioritySupport: true },
      limits: { weddings: null, guestsPerWedding: null, eventsPerWedding: null, customQuestionsPerWedding: null },
      isActive: false,
      sortOrder: 2,
    },
  ]
  for (const plan of planRows) {
    await prisma.plan.upsert({ where: { code: plan.code }, update: {}, create: plan })
  }

  const email = "demo@example.com"
  const passwordHash = await bcrypt.hash("demo1234", 12)

  const user = await prisma.user.upsert({
    where: { email },
    update: { name: "Demo Host", passwordHash },
    create: { name: "Demo Host", email, passwordHash },
  })

  let membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    include: { workspace: true },
  })

  if (!membership) {
    const workspace = await prisma.workspace.create({
      data: {
        name: "Demo Weddings",
        members: { create: { userId: user.id, role: "owner" } },
      },
    })
    membership = await prisma.workspaceMember.findFirst({
      where: { userId: user.id, workspaceId: workspace.id },
      include: { workspace: true },
    })
  }

  const wedding = await prisma.wedding.upsert({
    where: { invitationToken: "demo-invitation-token" },
    update: { published: true },
    create: {
      workspaceId: membership.workspaceId,
      name: "Rahul & Priya Wedding",
      coupleName1: "Rahul",
      coupleName2: "Priya",
      date: new Date("2027-02-14T00:00:00.000Z"),
      venue: "The Leela Palace, Bengaluru",
      address: "23 Old Airport Road, Bengaluru, Karnataka 560008",
      description:
        "With the blessings of our families, we invite you to celebrate our wedding. Please RSVP by 15 January 2027.",
      rsvpDeadline: new Date("2027-01-15T00:00:00.000Z"),
      timezone: "Asia/Kolkata",
      invitationToken: "demo-invitation-token",
      published: true,
    },
  })

  const eventSeeds = [
    { name: "Haldi", date: "2027-02-12", time: "10:00 AM", venue: "Family Residence", order: 1 },
    { name: "Mehendi", date: "2027-02-12", time: "5:00 PM", venue: "The Leela Palace", order: 2 },
    { name: "Wedding", date: "2027-02-14", time: "7:00 PM", venue: "The Leela Palace", order: 3 },
    { name: "Reception", date: "2027-02-15", time: "7:00 PM", venue: "The Leela Palace", order: 4 },
  ]

  const events = []
  for (const seed of eventSeeds) {
    const existing = await prisma.event.findFirst({ where: { weddingId: wedding.id, name: seed.name } })
    if (existing) {
      events.push(await prisma.event.update({ where: { id: existing.id }, data: { ...seed, date: new Date(seed.date) } }))
    } else {
      events.push(
        await prisma.event.create({
          data: { ...seed, date: new Date(seed.date), weddingId: wedding.id },
        }),
      )
    }
  }

  const questionSeeds = [
    { question: "Meal preference", type: "select", options: ["Vegetarian", "Non-vegetarian", "Jain"], required: true, order: 1 },
    { question: "Any accessibility needs?", type: "text", options: null, required: false, order: 2 },
  ]
  const questions = []
  for (const seed of questionSeeds) {
    const existing = await prisma.customQuestion.findFirst({
      where: { weddingId: wedding.id, question: seed.question },
    })
    const data = { ...seed, enabled: true, weddingId: wedding.id }
    questions.push(
      existing
        ? await prisma.customQuestion.update({ where: { id: existing.id }, data })
        : await prisma.customQuestion.create({ data }),
    )
  }

  const guestSeeds = [
    { firstName: "Aarav", lastName: "Sharma", mobile: "9876543210", group: "Bride's family", dietaryPrefs: "Vegetarian" },
    { firstName: "Isha", lastName: "Patel", mobile: "9876543211", group: "Groom's friends", dietaryPrefs: "Jain" },
    { firstName: "Vikram", lastName: "Rao", mobile: "9876543212", group: "Colleagues", dietaryPrefs: null },
    { firstName: "Meera", lastName: "Nair", mobile: "9876543213", group: "Bride's friends", dietaryPrefs: "Non-vegetarian" },
  ]

  const guests = []
  for (const seed of guestSeeds) {
    guests.push(
      await prisma.guest.upsert({
        where: { weddingId_mobile: { weddingId: wedding.id, mobile: seed.mobile } },
        update: seed,
        create: { ...seed, weddingId: wedding.id },
      }),
    )
  }

  const mealQuestion = questions.find((question) => question.question === "Meal preference")
  const rsvpWeddingEvent = events.find((event) => event.name === "Wedding")
  if (mealQuestion && rsvpWeddingEvent) {
    const submission = await prisma.rsvpSubmission.upsert({
      where: { guestId: guests[0].id },
      update: { status: "confirmed", dietaryPrefs: "Vegetarian" },
      create: {
        weddingId: wedding.id,
        guestId: guests[0].id,
        fullName: "Aarav Sharma",
        mobile: "9876543210",
        status: "confirmed",
        dietaryPrefs: "Vegetarian",
      },
    })

    await prisma.familyMember.deleteMany({ where: { rsvpSubmissionId: submission.id } })
    await prisma.familyMember.createMany({
      data: [
        { rsvpSubmissionId: submission.id, fullName: "Ananya Sharma", relation: "Spouse", dietaryPrefs: "Vegetarian" },
        { rsvpSubmissionId: submission.id, fullName: "Kabir Sharma", relation: "Son", age: 8 },
      ],
    })

    await prisma.rsvpEventResponse.deleteMany({ where: { rsvpSubmissionId: submission.id } })
    await prisma.rsvpEventResponse.createMany({
      data: [
        { rsvpSubmissionId: submission.id, eventId: events[1].id, status: "yes" },
        { rsvpSubmissionId: submission.id, eventId: rsvpWeddingEvent.id, status: "yes" },
        { rsvpSubmissionId: submission.id, eventId: events[3].id, status: "no" },
      ],
    })

    await prisma.answer.deleteMany({ where: { rsvpSubmissionId: submission.id } })
    await prisma.answer.create({
      data: { rsvpSubmissionId: submission.id, questionId: mealQuestion.id, value: "Vegetarian" },
    })
  }

  console.log("Seed complete")
  console.log("  Email:    demo@example.com")
  console.log("  Password: demo1234")
  console.log(`  Invitation: /invite/${wedding.invitationToken}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
