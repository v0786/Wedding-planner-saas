"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Field, FormError, Input } from "@/components/ui/field"

export default function RegisterForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })

      if (res.ok) {
        router.push("/auth/login?registered=1")
      } else {
        const data = await res.json()
        setError(data.error || "Something went wrong")
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
        <h2 className="font-display text-xl text-ink-800">Begin your wedding workspace</h2>
        <p className="mt-1 text-sm text-ink-500">A couple of details and you are ready to invite guests.</p>
        <div className="gold-hairline mt-5" />
      </div>

      <Field label="Full name" htmlFor="register-name">
        <Input
          id="register-name"
          type="text"
          required
          maxLength={120}
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
        />
      </Field>

      <Field label="Email address" htmlFor="register-email">
        <Input
          id="register-email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </Field>

      <Field label="Password" htmlFor="register-password">
        <Input
          id="register-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
        />
      </Field>

      <Field label="Confirm password" htmlFor="register-confirm-password">
        <Input
          id="register-confirm-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </Field>

      {error && <FormError>{error}</FormError>}

      <Button type="submit" disabled={loading} size="lg" className="w-full">
        {loading ? "Creating account..." : "Create account"}
      </Button>
    </form>
  )
}
