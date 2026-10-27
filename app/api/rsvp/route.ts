import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { nanoid } from "nanoid"
import crypto from "crypto"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { token, fullName, mobile, familyMembers = [], eventResponses = {} } = body

    const wedding = await prisma.wedding.findUnique({
      where: { invitationToken: token },
      include: { events: true },
    })

    if (!wedding || !wedding.published) {
      return NextResponse.json({ error: "Invalid or inactive invitation" }, { status: 400 })
    }

    // Check deadline
    if (wedding.rsvpDeadline && new Date() > wedding.rsvpDeadline) {
      return NextResponse.json({ error: "RSVP deadline has passed" }, { status: 400 })
    }

    // Create or find guest
    let guest = await prisma.guest.findFirst({
      where: { weddingId: wedding.id, mobile },
    })

    if (!guest) {
      guest = await prisma.guest.create({
        data: {
          weddingId: wedding.id,
          firstName: fullName.split(' ')[0] || fullName,
          lastName: fullName.split(' ').slice(1).join(' ') || null,
          mobile,
        },
      })
    }

    // Create or update RSVP submission
    const editToken = nanoid(32)
    const editTokenHash = crypto.createHash('sha256').update(editToken).digest('hex')

    const submission = await prisma.rsvpSubmission.upsert({
      where: { guestId: guest.id },
      update: {
        fullName,
        mobile,
        status: 'confirmed',
        editTokenHash,
        updatedAt: new Date(),
      },
      create: {
        weddingId: wedding.id,
        guestId: guest.id,
        fullName,
        mobile,
        status: 'confirmed',
        editTokenHash,
      },
    })

    // Clear existing family members
    await prisma.familyMember.deleteMany({
      where: { rsvpSubmissionId: submission.id },
    })

    // Add family members
    for (const member of familyMembers) {
      if (member.fullName) {
        await prisma.familyMember.create({
          data: {
            rsvpSubmissionId: submission.id,
            fullName: member.fullName,
            relation: member.relation || null,
          },
        })
      }
    }

    // Clear existing event responses
    await prisma.rsvpEventResponse.deleteMany({
      where: { rsvpSubmissionId: submission.id },
    })

    // Add event responses
    for (const [eventId, status] of Object.entries(eventResponses)) {
      const event = wedding.events.find(e => e.id === eventId)
      if (event && (status === 'yes' || status === 'no' || status === 'pending')) {
        await prisma.rsvpEventResponse.create({
          data: {
            rsvpSubmissionId: submission.id,
            eventId,
            status: status as string,
          },
        })
      }
    }

    return NextResponse.json({ success: true, editToken }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
