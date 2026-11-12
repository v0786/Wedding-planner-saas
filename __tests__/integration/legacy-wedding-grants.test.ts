import { readFileSync } from "node:fs"
import { join } from "node:path"
import { prisma } from "@/lib/prisma"
import { getWeddingEntitlements, getPlanConfig } from "@/lib/subscriptions/service"

it("backfills only existing paid-through weddings during the migration", async () => {
  const migration = readFileSync(join(process.cwd(), "prisma/migrations/20261111235000_legacy_wedding_grants/migration.sql"), "utf8")
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('CREATE TEMP TABLE "Plan" ("id" TEXT, "code" TEXT, "features" JSONB, "limits" JSONB) ON COMMIT DROP')
    await tx.$executeRawUnsafe('CREATE TEMP TABLE "Subscription" ("workspaceId" TEXT, "planId" TEXT, "status" TEXT, "currentPeriodEnd" TIMESTAMP(3)) ON COMMIT DROP')
    await tx.$executeRawUnsafe('CREATE TEMP TABLE "Wedding" ("id" TEXT, "workspaceId" TEXT) ON COMMIT DROP')
    await tx.$executeRaw`INSERT INTO "Plan" VALUES ('pro', 'PRO', '{"reports":true}'::jsonb, '{"eventsPerWedding":7}'::jsonb)`
    await tx.$executeRaw`INSERT INTO "Subscription" VALUES
      ('active', 'pro', 'ACTIVE', (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') + INTERVAL '2 days'),
      ('cancelled', 'pro', 'CANCELLED', (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') + INTERVAL '2 days'),
      ('expired', 'pro', 'ACTIVE', (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') - INTERVAL '2 days')`
    await tx.$executeRaw`INSERT INTO "Wedding" VALUES ('before', 'active'), ('during', 'active'), ('cancelled', 'cancelled'), ('expired', 'expired')`
    for (const statement of migration.split(";").filter((part) => part.trim())) {
      await tx.$executeRawUnsafe(statement)
    }
    await tx.$executeRaw`INSERT INTO "Wedding" ("id", "workspaceId") VALUES ('after', 'active')`
    const rows = await tx.$queryRaw<Array<{ id: string; legacyPlanCode: string | null; legacyPlanFeatures: unknown }>>`
      SELECT "id", "legacyPlanCode", "legacyPlanFeatures" FROM "Wedding" ORDER BY "id"`
    expect(rows.filter(row => row.legacyPlanCode === "PRO").map(row => row.id)).toEqual(["before", "cancelled", "during"])
    expect(rows.find(row => row.id === "after")?.legacyPlanCode).toBeNull()
    expect(rows.find(row => row.id === "expired")?.legacyPlanCode).toBeNull()
    expect(rows.find(row => row.id === "during")?.legacyPlanFeatures).toEqual({ reports: true })
  })
})

it("never inherits active workspace billing for a new wedding and preserves a fixed migrated grant", async () => {
  const owner = await prisma.user.create({ data: { email: `legacy-grant-${crypto.randomUUID()}@example.com` } })
  const plan = await getPlanConfig("PRO")
  const workspace = await prisma.workspace.create({ data: { name: "Legacy grants", members: { create: { userId: owner.id } } } })
  const paidThrough = new Date(Date.now() + 7 * 24 * 60 * 60_000)
  try {
    await prisma.subscription.create({ data: { workspaceId: workspace.id, planId: plan.id!, status: "ACTIVE", currentPeriodStart: new Date(), currentPeriodEnd: paidThrough } })
    const migrated = await prisma.wedding.create({ data: {
      workspaceId: workspace.id, name: "Existing migrated wedding", coupleName1: "Partner", date: new Date("2099-12-10"),
      legacyPlanCode: "PRO", legacyPaidThrough: paidThrough,
      legacyPlanFeatures: { reports: true, csvImport: true },
      legacyPlanLimits: { eventsPerWedding: 7 },
    } })
    const fresh = await prisma.wedding.create({ data: { workspaceId: workspace.id, name: "New independent wedding", coupleName1: "Partner", date: new Date("2099-12-10") } })
    expect(await getWeddingEntitlements(workspace.id, fresh.id)).toMatchObject({ planCode: "FREE", status: "FREE", features: { reports: false } })
    const granted = await getWeddingEntitlements(workspace.id, migrated.id)
    expect(granted).toMatchObject({ planCode: "PRO", status: "ACTIVE", features: { reports: true, csvImport: true }, limits: { eventsPerWedding: 7 } })
    expect(granted.currentPeriodEnd?.toISOString()).toBe(paidThrough.toISOString())
    await prisma.subscription.update({ where: { workspaceId: workspace.id }, data: { currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60_000) } })
    expect((await getWeddingEntitlements(workspace.id, migrated.id)).currentPeriodEnd?.toISOString()).toBe(paidThrough.toISOString())
    await prisma.wedding.update({ where: { id: migrated.id }, data: { legacyPaidThrough: new Date("2020-01-01") } })
    expect(await getWeddingEntitlements(workspace.id, migrated.id)).toMatchObject({ planCode: "FREE", status: "FREE" })
  } finally {
    await prisma.workspace.delete({ where: { id: workspace.id } })
    await prisma.user.delete({ where: { id: owner.id } })
  }
})

afterAll(() => prisma.$disconnect())
