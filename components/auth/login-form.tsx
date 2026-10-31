"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Field, FormError, Input } from "@/components/ui/field"

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid email or password")
      } else {
        router.push("/dashboard")
        router.refresh()
      }
    } catch (err) {
      console.error(err)
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="card-elevated space-y-5 p-6 sm:p-8" onSubmit={handleSubmit}>
      <div className="text-center">
        <h2 className="font-display text-xl text-ink-800">Welcome back</h2>
        <p className="mt-1 text-sm text-ink-500">Sign in to pick up where you left off.</p>
        <div className="gold-hairline mt-5" />
      </div>

      <Field label="Email address" htmlFor="login-email">
        <Input
          id="login-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </Field>

      <Field label="Password" htmlFor="login-password">
        <Input
          id="login-password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>

      {error && <FormError>{error}</FormError>}

      <Button type="submit" disabled={loading} size="lg" className="w-full">
        {loading ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  )
}
