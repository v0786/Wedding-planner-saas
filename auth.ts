import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { ensureAccountWorkspace } from "./lib/account-workspace"
import { prisma } from "./lib/prisma"
import bcrypt from "bcryptjs"
import { loginSchema } from "./lib/validation"
import { allowCredentialsAttempt } from "./lib/auth-login"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/auth/login",
  },
  providers: [
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET ? [Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      profile(profile) {
        return { id: profile.sub, name: profile.name, email: profile.email.trim().toLowerCase(), image: profile.picture }
      },
    })] : []),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null
        const { email, password } = parsed.data
        if (!await allowCredentialsAttempt(request, email)) return null
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user || !user.passwordHash) return null
        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) return null
        return { id: user.id, email: user.email, name: user.name, sessionVersion: user.sessionVersion }
      },
    }),
  ],
  events: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.id) {
        await ensureAccountWorkspace(user.id)
        await prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } })
      }
    },
  },
  callbacks: {
    async signIn({ account, profile }) {
      return account?.provider !== "google" || profile?.email_verified === true
    },
    async jwt({ token, user, account }) {
      const userId = user?.id ?? token.id
      if (typeof userId !== "string") return null
      const current = await prisma.user.findUnique({ where: { id: userId }, select: { sessionVersion: true } })
      if (!current) return null
      if (user) {
        const credentialsVersion = (user as { sessionVersion?: number }).sessionVersion
        if (account?.provider === "credentials" && credentialsVersion !== current.sessionVersion) return null
        token.id = userId
        token.sessionVersion = current.sessionVersion
      } else if ((token.sessionVersion ?? 0) !== current.sessionVersion) {
        return null
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string
      }
      return session
    },
  },
})
