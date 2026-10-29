import { describe, it, expect, jest, beforeEach } from "@jest/globals"
import { getWeddingAccess, requireWeddingAccess } from "@/lib/wedding-access"

const findFirst = jest.fn()

const fakeDb = {
  wedding: { findFirst },
} as unknown as Parameters<typeof getWeddingAccess>[2]

describe("tenant access", () => {
  beforeEach(() => findFirst.mockReset())

  it("scopes wedding lookup to workspace membership", async () => {
    findFirst.mockResolvedValue({ id: "wedding-1" } as never)
    const result = await getWeddingAccess("wedding-1", "user-1", fakeDb)

    expect(result).toEqual({ id: "wedding-1" })
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: "wedding-1",
        workspace: { members: { some: { userId: "user-1" } } },
      },
    })
  })

  it("throws a 404 when the user is not a member of the workspace", async () => {
    findFirst.mockResolvedValue(null as never)
    await expect(
      requireWeddingAccess("wedding-1", "other-user", fakeDb),
    ).rejects.toMatchObject({
      status: 404,
    })
  })
})
