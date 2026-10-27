"use client"

import { useMemo, useState } from "react"

type Guest = { name: string; household: string; events: string; status: "Confirmed" | "Pending" | "Maybe" }

const demoGuests: Guest[] = [
  { name: "Aarav Sharma", household: "Sharma family · 4 people", events: "All events", status: "Confirmed" },
  { name: "Priya Mehta", household: "Mehta family · 2 people", events: "Wedding, Reception", status: "Confirmed" },
  { name: "Rohan Kapoor", household: "Kapoor family · 3 people", events: "Wedding", status: "Maybe" },
  { name: "Nisha & Dev Patel", household: "Patel family · 5 people", events: "Pending response", status: "Pending" },
  { name: "Kabir Singh", household: "Singh family · 2 people", events: "Reception", status: "Confirmed" },
]

const navItems = [["Overview", "⌂"], ["Guests", "♧"], ["Events", "◷"], ["RSVP form", "▤"], ["Reports", "▥"], ["Help & FAQ", "?"]] as const

export function Dashboard() {
  const [active, setActive] = useState("Overview")
  const [query, setQuery] = useState("")
  const [showNotice, setShowNotice] = useState(false)
  const filtered = useMemo(() => demoGuests.filter((guest) => `${guest.name} ${guest.household}`.toLowerCase().includes(query.toLowerCase())), [query])

  return <div className="dashboard-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">W</div><div className="brand-copy"><strong>Wedding Guest</strong><small>Manager</small></div></div>
      <nav className="nav" aria-label="Main navigation">
        {navItems.map(([label, icon]) => <button key={label} className={active === label ? "active" : ""} onClick={() => setActive(label)} aria-current={active === label ? "page" : undefined}><span className="nav-icon" aria-hidden="true">{icon}</span><span className="nav-label">{label}</span></button>)}
      </nav>
      <div className="sidebar-note"><strong>One calm place</strong>Keep your families, events, and responses in sync.</div>
    </aside>
    <main className="main">
      <header className="topbar"><div><div className="eyebrow">Saturday, 18 January 2025</div><h1>Good morning, Ananya</h1></div><div className="top-actions"><span className="demo-pill">Demo workspace</span><div className="avatar" aria-label="Ananya Rao profile">AR</div></div></header>
      <section className="wedding-card" aria-labelledby="wedding-title"><div><div className="eyebrow">Your next wedding</div><h2 id="wedding-title">Ananya & Rohan</h2><div className="wedding-meta"><span>12 April 2025</span><span>·</span><span>Jaipur, Rajasthan</span></div></div><div className="wedding-date"><b>12</b><span>Apr 2025</span></div></section>
      <section className="metrics" aria-label="Wedding response summary"><Metric label="Guest records" value="86" note="12 households added"/><Metric label="People expected" value="142" note="Across 4 events"/><Metric label="Confirmed" value="68" note="48% of people"/><Metric label="Pending" value="18" note="Needs a gentle nudge"/></section>
      {showNotice && <div role="status" style={{background:"#e4f0e6", color:"#35644d", padding:"11px 14px", borderRadius:10, marginBottom:14, fontSize:12}}>This prototype uses demo data. Your changes are not saved yet.</div>}
      <div className="content-grid">
        <section className="panel" aria-labelledby="guests-heading"><div className="panel-head"><div><h3 id="guests-heading">Guest records</h3><p>Households and individual people, kept separate</p></div><button className="text-button" onClick={() => setShowNotice(true)}>View all guests →</button></div><div className="search-row"><label htmlFor="guest-search" className="sr-only">Search guest records</label><input id="guest-search" className="search" placeholder="Search names or households" value={query} onChange={(event) => setQuery(event.target.value)} /></div><div className="guest-list">{filtered.map((guest) => <GuestRow key={guest.name} guest={guest}/>)}{filtered.length === 0 && <p style={{padding:"22px", color:"var(--muted)", fontSize:12}}>No guest records match that search.</p>}</div></section>
        <div className="side-stack"><section className="panel" aria-labelledby="events-heading"><div className="panel-head"><div><h3 id="events-heading">Event attendance</h3><p>Expected people by event</p></div><button className="text-button" onClick={() => setShowNotice(true)}>Manage</button></div><div className="events"><Event name="Mehendi" date="09 Apr · 6:00 PM" count="96"/><Event name="Haldi" date="10 Apr · 11:00 AM" count="82"/><Event name="Wedding ceremony" date="12 Apr · 5:00 PM" count="128"/><Event name="Reception" date="13 Apr · 7:00 PM" count="118"/></div></section><section className="panel" aria-labelledby="quick-heading"><div className="panel-head"><div><h3 id="quick-heading">Quick actions</h3><p>Keep planning moving</p></div></div><div className="quick-actions"><button className="quick" onClick={() => setShowNotice(true)}><b>+</b>Add guests</button><button className="quick" onClick={() => setShowNotice(true)}><b>↗</b>Share RSVP</button><button className="quick" onClick={() => setShowNotice(true)}><b>↓</b>Import CSV</button><button className="quick" onClick={() => setShowNotice(true)}><b>▥</b>View reports</button></div></section></div>
      </div>
    </main>
  </div>
}

function Metric({ label, value, note }: { label:string; value:string; note:string }) { return <div className="metric"><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-note">{note}</div></div> }
function GuestRow({ guest }: { guest: Guest }) { return <div className="guest-row"><div className="guest-info"><div className="guest-initial">{guest.name.split(" ").map((part) => part[0]).slice(0,2).join("")}</div><div><strong>{guest.name}</strong><span>{guest.household} · {guest.events}</span></div></div><span className={`status ${guest.status.toLowerCase()}`}>{guest.status}</span></div> }
function Event({ name, date, count }: { name:string; date:string; count:string }) { return <div className="event"><span className="event-dot" aria-hidden="true"/><div><strong>{name}</strong><span>{date}</span></div><span className="event-count">{count}</span></div> }
