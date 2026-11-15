import { randomUUID } from "crypto"
import { prisma } from "@/lib/prisma"

// Even an accidentally granted SELECT must not expose rows through the Data
// API. Auth.js sessions only authorize requests through the server handlers.
it("enables deny-by-default RLS on every application table", async () => {
  const tables = await prisma.$queryRaw<Array<{ tablename: string; rowsecurity: boolean }>>`
    SELECT tablename, rowsecurity FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `
  expect(tables.length).toBeGreaterThanOrEqual(31)
  expect(tables.filter(table => !table.rowsecurity)).toEqual([])
})

it("prevents an untrusted database role from reading or modifying host data", async () => {
  const role = `rls_test_${randomUUID().replaceAll("-", "")}`
  const email = `rls-${randomUUID()}@example.com`
  const user = await prisma.user.create({ data: { email } })
  // The temporary test role is not used outside this rolled-back transaction.
  try {
    await prisma.$transaction(async tx => {
      await tx.$executeRawUnsafe(`CREATE ROLE "${role}" NOLOGIN`)
      await tx.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO "${role}"`)
      await tx.$executeRawUnsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "User" TO "${role}"`)
      await tx.$executeRawUnsafe(`SET LOCAL ROLE "${role}"`)
      expect(await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id}`).toEqual([])
      expect(await tx.$executeRaw`UPDATE "User" SET name = 'Untrusted' WHERE id = ${user.id}`).toBe(0)
      expect(await tx.$executeRaw`DELETE FROM "User" WHERE id = ${user.id}`).toBe(0)
      await expect(tx.$executeRaw`INSERT INTO "User" (id, email, "updatedAt") VALUES (${randomUUID()}, ${`blocked-${email}`}, NOW())`).rejects.toThrow()
      // An aborted transaction rolls back temporary role and grants together.
      throw new Error("ROLLBACK_TEST_ROLE")
    }).catch(error => {
      if (error.message !== "ROLLBACK_TEST_ROLE") throw error
    })
    expect(await prisma.user.findUnique({ where: { id: user.id } })).toMatchObject({ email, name: null })
  } finally {
    await prisma.user.delete({ where: { id: user.id } })
  }
})
