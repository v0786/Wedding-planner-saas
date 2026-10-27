# Project Tracker --- Wedding Planner SaaS

**Last updated:** 2026-10-28\
**Overall status:** Planning / pre-coding

## Status legend

-   `DONE` = decision confirmed or planning item completed.
-   `OPEN` = needs a product decision.
-   `TODO` = planned work not started.
-   `BLOCKED` = cannot proceed until dependency is resolved.

## 1. Product decisions

  -------------------------------------------------------------------------
  Item                      Status                  Notes
  ------------------------- ----------------------- -----------------------
  Product concept and       DONE                    Guest management,
  Indian wedding focus                              invitation, RSVP,
                                                    reports

  One shared invitation     DONE                    Same guest-facing form
  link per wedding                                  for everyone

  No                        DONE                    Host internal
  guest-category-specific                           organization does not
  forms/links                                       change the form

  Guest journey             DONE                    Link → fill form →
                                                    submit

  No OTP                    DONE                    Name + mobile; Google
                                                    sign-in may be offered

  Customizable RSVP         DONE                    Standard questions plus
  questions                                         host-defined questions

  Family members            DONE                    Count people accurately
  individually listed                               

  Event-specific attendance DONE                    Haldi, Mehendi,
                                                    Wedding, Reception,
                                                    etc.

  Host-configured editing   DONE                    Wedding-wide default,
  deadline                                          event-specific advanced
                                                    option

  Re-submission behavior    DONE                    Update existing
                                                    response; no duplicate
                                                    counts

  FAQ before chatbot        DONE                    FAQ is MVP host help

  WhatsApp notifications    TODO                    Later phase, official
                                                    business integration

  Chatbot                   TODO                    After FAQ; start with
                                                    FAQs, then authorized
                                                    data queries

  Final product name/domain OPEN                    Working name only

  Exact household/RSVP      OPEN                    Must resolve before
  schema                                            migrations

  Final stack/provider      OPEN                    Proposed stack
  selection                                         documented

  Pricing/customer segment  OPEN                    Validate with real
                                                    hosts
  -------------------------------------------------------------------------

## 2. Pre-coding tasks

  ------------------------------------------------------------------------------
  Task                    Status                  Acceptance / next action
  ----------------------- ----------------------- ------------------------------
  Align all seven         DONE                    Current decisions reflected in
  documents                                       pack

  Finalize host dashboard OPEN                    Single wedding vs overview of
  landing behavior                                all weddings

  Finalize question types OPEN                    Approve supported types and
  and conditional logic                           editing behavior

  Define private          OPEN                    Secure recovery without OTP;
  edit-link recovery                              avoid identity disclosure

  Define deadline         OPEN                    Server is authoritative
  timezone and mixed                              
  event deadlines                                 

  Define privacy,         TODO                    Draft before pilot
  retention, and deletion                         
  policy                                          

  Validate product with   TODO                    Interviews and feedback
  5--10 potential                                 
  customers                                       

  Identify 1--3 pilot     TODO                    Confirm willingness to test
  weddings                                        

  Review and approve      TODO                    No coding before approval
  technical architecture                          

  Resolve GitHub          BLOCKED                 Connector returns 404 for
  repository access                               `v0786/Wedding-planner-saas`

  Push updated docs to    BLOCKED                 Requires repository access; no
  GitHub                                          push claimed
  ------------------------------------------------------------------------------

## 3. MVP workstreams after approval

1.  Foundation, auth, workspace isolation.
2.  Wedding and event management.
3.  Guest/household management and CSV.
4.  Public invitation and custom RSVP form.
5.  Secure response updates and deadline enforcement.
6.  Dashboard, reports, and FAQ.
7.  Security, testing, and pilot readiness.

## 4. Risks

-   Incorrect household/person modeling can produce wrong catering
    counts.
-   Public link abuse or insecure edit links can expose or modify RSVP
    data.
-   Event-specific deadlines require careful handling for multi-event
    responses.
-   WhatsApp Business integration may have setup, template, consent, and
    message costs.
-   Product demand and pricing are not yet validated.
-   GitHub repository access is currently blocked in the connected tool.

## 5. Session update rule

After each meaningful work session, update status, decisions, blockers,
tests, and next actions. Do not mark implementation complete without
code and test evidence.
