import type { RolePlayScenario } from "../domain/types";

export const scenarios: readonly RolePlayScenario[] = [
  {
    id: "impossible-travel",
    title: "Two cities, one identity",
    subtitle: "Triage an impossible-travel alert without assuming the answer",
    summary:
      "A finance employee's account appears in Dubai and Reykjavik within minutes, followed by an unusual document export. Decide what to verify, contain, and communicate.",
    difficulty: "foundation",
    estimatedMinutes: 18,
    familyIds: ["security-operations", "incident-response-forensics"],
    primaryRoleId: "soc-analyst",
    supportingRoleIds: ["threat-hunter", "incident-responder"],
    competencyIds: [
      "identity-access-management",
      "security-operations-detection",
      "incident-response-forensics",
      "leadership-communication",
    ],
    setting:
      "Northstar Books is a fictional online retailer. Its names, accounts, addresses, and telemetry exist only inside this simulation.",
    learnerBrief:
      "You are the on-duty SOC analyst. Protect the employee and business, preserve useful evidence, and keep the case record explicit about facts, hypotheses, and confidence.",
    objectives: [
      "Prioritize identity evidence that reduces uncertainty.",
      "Choose proportionate, reversible containment.",
      "Escalate with scope, impact, confidence, and a clear ask.",
    ],
    actors: [
      {
        id: "maya",
        name: "Maya Chen",
        title: "SOC shift lead",
        publicPosition: "Wants a decision in ten minutes because finance data may be involved.",
        concern: "Avoid both a missed compromise and an unjustified business-wide shutdown.",
      },
      {
        id: "daniel",
        name: "Daniel Okafor",
        title: "Finance planning analyst",
        publicPosition: "Says he is in Dubai and used the approved finance portal this morning.",
        concern: "He has a forecast due and is worried about losing work.",
      },
      {
        id: "leena",
        name: "Leena Das",
        title: "Identity engineer",
        publicPosition: "Can revoke sessions quickly but wants the suspicious session identifiers first.",
        concern: "A tenant-wide token reset would interrupt thousands of users.",
      },
    ],
    evidence: [
      {
        id: "travel-alert",
        title: "Identity alert",
        kind: "alert",
        content:
          "08:12 GST: successful sign-in from Daniel's managed laptop in Dubai. 08:33 GST: successful browser session from an address geolocated to Reykjavik. Alert confidence: medium.",
        significance:
          "The geography is suspicious, but location data and network relays can be misleading; session and device context matter.",
        initiallyVisible: true,
      },
      {
        id: "session-log",
        title: "Session details",
        kind: "log",
        content:
          "The Reykjavik session used a new browser fingerprint and a commercial hosting network. It accessed a finance folder and exported 42 files. Daniel's managed laptop remained healthy in Dubai.",
        significance:
          "A new device plus data access raises impact, while the healthy laptop suggests the suspicious session can be contained separately.",
        initiallyVisible: false,
      },
      {
        id: "user-note",
        title: "Known-channel user check",
        kind: "interview-note",
        content:
          "Daniel confirms he is in Dubai, did not use a privacy relay, did not export 42 files, and approved an unexpected sign-in prompt while distracted.",
        significance:
          "The user's statement corroborates unauthorized activity and suggests a compromised session, but the account's full scope still needs investigation.",
        initiallyVisible: false,
      },
      {
        id: "case-timeline",
        title: "Correlated timeline",
        kind: "timeline",
        content:
          "08:29 unexpected approval; 08:33 new session; 08:36 finance-folder browse; 08:41 export begins; 08:47 export completes. No administrative actions observed.",
        significance:
          "The ordered facts support escalation and targeted containment while defining the earliest known suspicious event.",
        initiallyVisible: false,
      },
    ],
    decisionPoints: [
      {
        id: "travel-d1",
        phase: "assess",
        title: "Choose the next evidence",
        context: "You have a medium-confidence geography alert and five minutes before the shift-lead update.",
        prompt: "What should you do first?",
        evidenceIds: ["travel-alert"],
        options: [
          {
            id: "travel-d1-a",
            label: "Compare session, device, network, and application activity, then contact Daniel through a known channel.",
            quality: "strong",
            coachFeedback:
              "This tests multiple explanations quickly and avoids trusting either geolocation or an inbound message by itself.",
            consequences: ["The suspicious session is identified.", "Daniel's statement is independently verified."],
          },
          {
            id: "travel-d1-b",
            label: "Close it because impossible-travel alerts are often caused by network routing.",
            quality: "unsafe",
            coachFeedback:
              "A known false-positive pattern is a hypothesis, not evidence. The unusual data activity would continue unchecked.",
            consequences: ["The export finishes.", "The case lacks a defensible closure rationale."],
          },
          {
            id: "travel-d1-c",
            label: "Disable every finance account immediately before checking session scope.",
            quality: "partial",
            coachFeedback:
              "The instinct to contain is useful, but a broad action is disproportionate when targeted session controls and quick verification are available.",
            consequences: ["Finance work is disrupted.", "The suspicious session may still need explicit revocation."],
          },
        ],
        recommendedOptionId: "travel-d1-a",
      },
      {
        id: "travel-d2",
        phase: "contain",
        title: "Contain the identity event",
        context:
          "The new browser exported files, and Daniel denies the activity after acknowledging an unexpected approval.",
        prompt: "Which containment and escalation package is most proportionate?",
        evidenceIds: ["session-log", "user-note"],
        options: [
          {
            id: "travel-d2-a",
            label: "Revoke Daniel's active sessions, temporarily restrict the account, preserve logs, and escalate with observed scope.",
            quality: "strong",
            coachFeedback:
              "The action interrupts the confirmed path, is reversible, preserves evidence, and gives responders a bounded starting point.",
            consequences: ["The suspicious session ends.", "Response begins with a clear evidence package."],
          },
          {
            id: "travel-d2-b",
            label: "Ask Daniel to change his password later and keep watching the alert.",
            quality: "unsafe",
            coachFeedback:
              "Waiting leaves an active session and does not address token or session risk.",
            consequences: ["Unauthorized access may continue.", "Potential impact grows."],
          },
          {
            id: "travel-d2-c",
            label: "Delete Daniel's account and all exported-file audit records.",
            quality: "unsafe",
            coachFeedback:
              "Deletion is unnecessarily destructive and removes evidence needed to scope and learn from the event.",
            consequences: ["Business data and evidence are lost.", "Scope becomes harder to establish."],
          },
        ],
        recommendedOptionId: "travel-d2-a",
      },
      {
        id: "travel-d3",
        phase: "improve",
        title: "Close the loop",
        context:
          "Responders found no administrative activity. The exported files were confidential forecasts; access has been restored safely.",
        prompt: "What should your closure note recommend?",
        evidenceIds: ["case-timeline"],
        options: [
          {
            id: "travel-d3-a",
            label: "Document impact and confidence, tune the playbook around session context, and assign identity-control follow-up.",
            quality: "strong",
            coachFeedback:
              "A good closure explains the decision and improves both prevention and future investigation quality.",
            consequences: ["The case is reproducible.", "A named owner tracks the control improvement."],
          },
          {
            id: "travel-d3-b",
            label: "Record only 'account compromised—resolved' and close the case.",
            quality: "partial",
            coachFeedback:
              "The label is not enough to reproduce the investigation, understand impact, or improve coverage.",
            consequences: ["Important context is lost.", "The same response gaps may recur."],
          },
          {
            id: "travel-d3-c",
            label: "Publish Daniel's name and mistake to the whole company as a warning.",
            quality: "unsafe",
            coachFeedback:
              "Public blame is unnecessary, harms reporting culture, and may expose personal information.",
            consequences: ["Trust declines.", "Employees may hide future mistakes."],
          },
        ],
        recommendedOptionId: "travel-d3-a",
      },
    ],
    idealResponseSteps: [
      "Validate session, device, network, and application context.",
      "Confirm user activity through a trusted contact route.",
      "Revoke suspicious access and temporarily restrict the affected identity.",
      "Preserve and correlate telemetry from the earliest suspicious event.",
      "Escalate with facts, impact, confidence, gaps, actions, and a clear request.",
      "Restore access safely and assign detection and identity-control improvements.",
    ],
    scoreDimensions: [
      {
        competencyId: "security-operations-detection",
        label: "Evidence-led triage",
        description: "Uses corroborating context and distinguishes facts from hypotheses.",
      },
      {
        competencyId: "incident-response-forensics",
        label: "Proportionate containment",
        description: "Interrupts likely harm while preserving evidence and limiting disruption.",
      },
      {
        competencyId: "leadership-communication",
        label: "Actionable escalation",
        description: "Communicates scope, confidence, impact, gaps, actions, and asks.",
      },
    ],
    debriefQuestions: [
      "Which observation changed the incident confidence most, and why?",
      "What would make a tenant-wide containment action proportionate?",
      "How would you explain the event to Daniel without blame?",
    ],
    safetyNote:
      "All identities, domains, addresses, and telemetry are fictional. The scenario teaches defensive analysis and contains no live credentials or targets.",
  },
  {
    id: "ransomware-standup",
    title: "The 09:10 incident stand-up",
    subtitle: "Command a ransomware response while the business is under pressure",
    summary:
      "A fictional manufacturer has encrypted office endpoints and an attempted backup-console login. Coordinate the first hour, an executive update, and recovery criteria.",
    difficulty: "advanced",
    estimatedMinutes: 24,
    familyIds: ["incident-response-forensics", "security-operations", "leadership-strategy"],
    primaryRoleId: "incident-commander",
    supportingRoleIds: [
      "incident-responder",
      "digital-forensics-examiner",
      "soc-manager",
      "ciso",
    ],
    competencyIds: [
      "incident-response-forensics",
      "security-operations-detection",
      "risk-management",
      "leadership-communication",
    ],
    setting:
      "Aster Forge is a fictional parts manufacturer. Its corporate network and plant environment are simulated and contain no operational technology instructions.",
    learnerBrief:
      "You are incident commander. Establish a shared operating picture, protect safety and continuity, assign work, and make uncertainty visible.",
    objectives: [
      "Set first-hour objectives, roles, cadence, and decision rights.",
      "Balance containment, evidence, and operational continuity.",
      "Define recovery verification and accountable improvement actions.",
    ],
    actors: [
      {
        id: "sara",
        name: "Sara Malik",
        title: "Chief operating officer",
        publicPosition: "Wants to know whether production must stop and when office systems will return.",
        concern: "Worker safety, missed shipments, and customer commitments.",
      },
      {
        id: "jon",
        name: "Jon Bell",
        title: "Incident response lead",
        publicPosition: "Has confirmed encryption on 17 office endpoints but not the initial access path.",
        concern: "Containing spread before evidence is overwritten.",
      },
      {
        id: "amina",
        name: "Amina Noor",
        title: "Infrastructure recovery lead",
        publicPosition: "Says offline backups appear healthy but restoration will take time.",
        concern: "A rushed restore could reintroduce the cause or destroy useful evidence.",
      },
      {
        id: "victor",
        name: "Victor Reyes",
        title: "Plant operations director",
        publicPosition: "Reports no signs of impact to the separately managed plant-control network.",
        concern: "A blanket shutdown could create operational and safety risk.",
      },
    ],
    evidence: [
      {
        id: "ransom-alert",
        title: "Initial incident summary",
        kind: "alert",
        content:
          "Seventeen office endpoints display ransom notes. Endpoint tooling isolated nine automatically. No confirmed impact to the separately administered plant-control network.",
        significance:
          "The event is serious, but known impact remains bounded; the team must not present unverified spread as fact.",
        initiallyVisible: true,
      },
      {
        id: "backup-log",
        title: "Backup console events",
        kind: "log",
        content:
          "A disabled contractor identity attempted three backup-console sign-ins at 08:44. All failed. Offline recovery copies passed last night's integrity check.",
        significance:
          "The attempted access is an investigation lead, while known-good offline copies improve—but do not guarantee—recovery options.",
        initiallyVisible: false,
      },
      {
        id: "response-board",
        title: "First-hour action board",
        kind: "timeline",
        content:
          "Containment owner assigned; evidence collection begins; identity team reviewing contractor access; operations validating segmentation; updates scheduled every 30 minutes.",
        significance:
          "Explicit owners and cadence reduce duplication and create a reliable source of truth.",
        initiallyVisible: false,
      },
      {
        id: "recovery-plan",
        title: "Recovery proposal",
        kind: "forensic-note",
        content:
          "Proposed pilot: rebuild two priority endpoints from a trusted baseline, rotate affected credentials, apply current controls, restore verified data, and monitor before wider restoration.",
        significance:
          "A staged pilot creates evidence that the recovery path is clean and sustainable before scaling it.",
        initiallyVisible: false,
      },
    ],
    decisionPoints: [
      {
        id: "ransom-d1",
        phase: "contain",
        title: "Set first-hour objectives",
        context: "Leadership is waiting while responders receive new alerts.",
        prompt: "What direction do you give the team?",
        evidenceIds: ["ransom-alert"],
        options: [
          {
            id: "ransom-d1-a",
            label: "Isolate confirmed office endpoints, validate segmentation, preserve priority evidence, protect backups, and assign scoped workstreams.",
            quality: "strong",
            coachFeedback:
              "This reduces known harm, protects recovery, preserves evidence, and avoids an unverified plant-wide action.",
            consequences: ["Known affected systems are contained.", "Work proceeds under named owners and shared objectives."],
          },
          {
            id: "ransom-d1-b",
            label: "Order every corporate and plant system powered off immediately.",
            quality: "unsafe",
            coachFeedback:
              "A blanket shutdown could create safety and recovery problems when plant impact is not established. Safety and operations leaders must inform that decision.",
            consequences: ["Production is disrupted.", "Some volatile evidence may be lost."],
          },
          {
            id: "ransom-d1-c",
            label: "Wait for complete root-cause certainty before containing anything else.",
            quality: "unsafe",
            coachFeedback:
              "Containment rarely waits for full certainty; reversible actions can reduce harm while the investigation continues.",
            consequences: ["Additional office systems may be exposed.", "Leadership receives no workable plan."],
          },
        ],
        recommendedOptionId: "ransom-d1-a",
      },
      {
        id: "ransom-d2",
        phase: "communicate",
        title: "Give the executive update",
        context: "The COO asks, 'Is the plant safe, and will we ship today?'",
        prompt: "Which update best supports a decision?",
        evidenceIds: ["backup-log", "response-board"],
        options: [
          {
            id: "ransom-d2-a",
            label: "State confirmed office impact, no current plant evidence, validation underway, immediate priorities, next update time, and decisions needed from operations.",
            quality: "strong",
            coachFeedback:
              "This separates fact from uncertainty and gives the COO a cadence and clear decision role.",
            consequences: ["Executives share the same operating picture.", "Operations can plan with explicit uncertainty."],
          },
          {
            id: "ransom-d2-b",
            label: "Say the plant is completely safe because no alert has fired there.",
            quality: "unsafe",
            coachFeedback:
              "Absence of an alert is not proof of safety. Overconfidence damages trust if new evidence appears.",
            consequences: ["Leadership may make decisions on false certainty.", "Later updates appear contradictory."],
          },
          {
            id: "ransom-d2-c",
            label: "Read every endpoint event aloud and avoid making a recommendation.",
            quality: "partial",
            coachFeedback:
              "Technical facts matter, but leaders need synthesized impact, uncertainty, actions, choices, and asks.",
            consequences: ["The update consumes time.", "Decision-makers still lack direction."],
          },
        ],
        recommendedOptionId: "ransom-d2-a",
      },
      {
        id: "ransom-d3",
        phase: "recover",
        title: "Approve the recovery path",
        context: "Priority teams need workstations, and offline copies appear intact.",
        prompt: "What recovery approach do you authorize?",
        evidenceIds: ["recovery-plan"],
        options: [
          {
            id: "ransom-d3-a",
            label: "Run the clean pilot, validate controls and monitoring, document acceptance criteria, then expand in priority order.",
            quality: "strong",
            coachFeedback:
              "Staged recovery tests the full path and makes the decision to scale evidence-based.",
            consequences: ["Recovery confidence increases.", "Problems can be corrected before wide restoration."],
          },
          {
            id: "ransom-d3-b",
            label: "Restore all endpoints at once from the newest available copy.",
            quality: "unsafe",
            coachFeedback:
              "A mass restore without validating baseline, credentials, data, controls, and monitoring risks repeating the incident.",
            consequences: ["Recovery may reintroduce unsafe conditions.", "Teams lose a controlled learning point."],
          },
          {
            id: "ransom-d3-c",
            label: "Delay every restoration until the entire investigation is complete.",
            quality: "partial",
            coachFeedback:
              "Some questions may take weeks. Risk-managed, verified recovery can proceed while deeper investigation continues.",
            consequences: ["Business interruption grows.", "Recovery capacity remains unused."],
          },
        ],
        recommendedOptionId: "ransom-d3-a",
      },
    ],
    idealResponseSteps: [
      "Declare severity, objectives, command roles, source of truth, and update cadence.",
      "Contain confirmed paths and protect backups while validating business-critical segmentation.",
      "Preserve time-sensitive evidence and investigate identity, endpoint, and access scope in parallel.",
      "Brief leaders with facts, uncertainty, impact, actions, next update, and required decisions.",
      "Pilot recovery from trusted baselines and verified data with heightened monitoring.",
      "Run a blameless review and assign systemic improvements with owners and deadlines.",
    ],
    scoreDimensions: [
      {
        competencyId: "incident-response-forensics",
        label: "Command discipline",
        description: "Creates objectives, ownership, cadence, evidence protection, and verified recovery.",
      },
      {
        competencyId: "risk-management",
        label: "Operational judgment",
        description: "Balances harm reduction, safety, continuity, and uncertainty.",
      },
      {
        competencyId: "leadership-communication",
        label: "Crisis clarity",
        description: "Gives concise, decision-ready updates without false certainty.",
      },
    ],
    debriefQuestions: [
      "Which decisions belong to the incident commander, and which require business or safety owners?",
      "How can recovery begin before root cause is fully known?",
      "What would you record in the decision log during the first hour?",
    ],
    safetyNote:
      "This fictional exercise focuses on defensive coordination. It includes no malware, payloads, live infrastructure, or operational-control procedures.",
  },
  {
    id: "harborview-assessment",
    title: "Harborview staging assessment",
    subtitle: "Deliver an authorized assessment that developers can act on",
    summary:
      "A junior tester and vulnerability analyst assess a fictional booking portal before release. Protect scope, validate a finding safely, and prioritize remediation in context.",
    difficulty: "intermediate",
    estimatedMinutes: 20,
    familyIds: ["offensive-vulnerability", "engineering-architecture"],
    primaryRoleId: "vulnerability-assessment-analyst",
    supportingRoleIds: [
      "junior-penetration-tester",
      "cybersecurity-engineer",
      "principal-security-architect",
    ],
    competencyIds: [
      "vulnerability-assessment-testing",
      "secure-engineering-architecture",
      "risk-management",
      "leadership-communication",
    ],
    setting:
      "Harborview Travel and its booking portal are fictional. The assessment target is an isolated staging environment containing synthetic records.",
    learnerBrief:
      "You are the vulnerability assessment analyst. Confirm authorization, supervise safe validation, and produce evidence that leads to proportionate fixes.",
    objectives: [
      "Use scope and stop conditions to govern technical testing.",
      "Validate without accessing unnecessary data or disrupting service.",
      "Prioritize findings using exposure, impact, and compensating controls.",
    ],
    actors: [
      {
        id: "eli",
        name: "Eli Turner",
        title: "Junior penetration tester",
        publicPosition: "Has found a diagnostic route and wants to explore connected systems.",
        concern: "Proving enough impact to make the report useful without exceeding scope.",
      },
      {
        id: "noor",
        name: "Noor Haddad",
        title: "Product engineering lead",
        publicPosition: "Wants to release Friday and says the staging data is synthetic.",
        concern: "Avoiding a delay while fixing issues that could reach production.",
      },
      {
        id: "owen",
        name: "Owen Park",
        title: "Security architect",
        publicPosition: "Can approve design changes but needs clear exposure and control context.",
        concern: "Preventing the same diagnostic pattern across other services.",
      },
    ],
    evidence: [
      {
        id: "roe",
        title: "Rules of engagement",
        kind: "policy",
        content:
          "Authorized: harborview-staging.test booking portal, synthetic accounts, 09:00–17:00. Excluded: payment-provider systems, denial-of-service activity, persistence, and access beyond the minimum proof. Stop on instability or unexpected real data.",
        significance:
          "The document defines both permission and limits; a connected system is not automatically in scope.",
        initiallyVisible: true,
      },
      {
        id: "diagnostic-note",
        title: "Validated diagnostic exposure",
        kind: "forensic-note",
        content:
          "An unauthenticated staging diagnostic route reveals application version, internal service labels, and a synthetic booking identifier. Validation stopped after one request and no additional records were accessed.",
        significance:
          "The minimum proof confirms information exposure without collecting unnecessary data.",
        initiallyVisible: false,
      },
      {
        id: "deployment-context",
        title: "Deployment context",
        kind: "architecture-note",
        content:
          "The same deployment template is planned for production Friday. Production would be internet-facing, but the edge configuration can block diagnostic routes and the application team can remove the route in code.",
        significance:
          "Current staging impact is limited, while planned reuse and future exposure increase remediation urgency.",
        initiallyVisible: false,
      },
      {
        id: "fix-record",
        title: "Remediation proposal",
        kind: "architecture-note",
        content:
          "Immediate: block the route at the edge and add a release check. Durable: remove production diagnostics, centralize safe health checks, and scan templates for the pattern. Owner: product engineering; validation before release.",
        significance:
          "Layered remediation addresses immediate exposure and the systemic deployment pattern.",
        initiallyVisible: false,
      },
    ],
    decisionPoints: [
      {
        id: "harbor-d1",
        phase: "brief",
        title: "Keep the test authorized",
        context: "Eli sees the diagnostic output name a payment service hosted elsewhere.",
        prompt: "How do you direct the next step?",
        evidenceIds: ["roe"],
        options: [
          {
            id: "harbor-d1-a",
            label: "Stop at the scoped proof, record the reference, and ask the assessment owner whether separate authorization is warranted.",
            quality: "strong",
            coachFeedback:
              "A technical relationship does not expand authorization. This preserves the lead without crossing the agreed boundary.",
            consequences: ["Testing remains authorized.", "The possible dependency risk is routed to the owner."],
          },
          {
            id: "harbor-d1-b",
            label: "Follow the reference because anything reachable from the portal is implicitly in scope.",
            quality: "unsafe",
            coachFeedback:
              "Reachability is not permission, and the payment provider is explicitly excluded.",
            consequences: ["The team exceeds authorization.", "A third party may be affected."],
          },
          {
            id: "harbor-d1-c",
            label: "Ignore the diagnostic route because staging never represents production risk.",
            quality: "partial",
            coachFeedback:
              "Staging impact may be lower, but planned deployment patterns make the finding relevant to release risk.",
            consequences: ["A useful finding is missed.", "The pattern may ship to production."],
          },
        ],
        recommendedOptionId: "harbor-d1-a",
      },
      {
        id: "harbor-d2",
        phase: "assess",
        title: "Validate the minimum proof",
        context: "You need enough evidence for the developer without collecting more records.",
        prompt: "Which validation approach is appropriate?",
        evidenceIds: ["diagnostic-note", "deployment-context"],
        options: [
          {
            id: "harbor-d2-a",
            label: "Record one sanitized response, affected route and deployment context, then stop and notify the owner.",
            quality: "strong",
            coachFeedback:
              "The evidence is reproducible and sufficient while honoring data minimization and stop conditions.",
            consequences: ["The finding is confirmed safely.", "Developers receive actionable context."],
          },
          {
            id: "harbor-d2-b",
            label: "Collect every available record to demonstrate maximum possible volume.",
            quality: "unsafe",
            coachFeedback:
              "Excess collection creates unnecessary risk and is not needed to prove the exposure.",
            consequences: ["Testing risk increases.", "The team may violate its rules of engagement."],
          },
          {
            id: "harbor-d2-c",
            label: "Report a critical production breach without noting that the evidence is from staging.",
            quality: "unsafe",
            coachFeedback:
              "Severity must reflect verified conditions and likely production exposure, not an exaggerated claim.",
            consequences: ["Credibility falls.", "Remediation may be poorly prioritized."],
          },
        ],
        recommendedOptionId: "harbor-d2-a",
      },
      {
        id: "harbor-d3",
        phase: "improve",
        title: "Recommend the fix",
        context: "The team can add an edge rule today, but the diagnostic pattern exists in a shared template.",
        prompt: "What recommendation best reduces current and recurring risk?",
        evidenceIds: ["fix-record"],
        options: [
          {
            id: "harbor-d3-a",
            label: "Use the edge block as immediate mitigation, remove the route in code, add a release check, and retest both controls.",
            quality: "strong",
            coachFeedback:
              "This combines fast exposure reduction with a durable root-cause fix and verification.",
            consequences: ["Release risk is reduced.", "Future services gain a preventive check."],
          },
          {
            id: "harbor-d3-b",
            label: "Accept a permanent edge-only workaround without ownership or validation.",
            quality: "partial",
            coachFeedback:
              "The edge control helps, but an unowned workaround may drift and leaves the unsafe template unchanged.",
            consequences: ["The immediate route may be blocked.", "The pattern can recur elsewhere."],
          },
          {
            id: "harbor-d3-c",
            label: "Recommend cancelling the entire product with no discussion of treatment options.",
            quality: "unsafe",
            coachFeedback:
              "The verified issue has practical mitigations. The assessor should explain risk and options rather than claim the owner's decision.",
            consequences: ["The recommendation is disproportionate.", "Stakeholders may disregard future findings."],
          },
        ],
        recommendedOptionId: "harbor-d3-a",
      },
    ],
    idealResponseSteps: [
      "Confirm written scope, authorization, methods, exclusions, contacts, and stop conditions.",
      "Validate only the minimum evidence required and protect collected data.",
      "Document verified environment, exposure, assumptions, and production relevance.",
      "Prioritize with asset, reachability, impact, and compensating controls.",
      "Recommend immediate and durable fixes with owners and validation criteria.",
      "Retest within authorization and record residual risk or closure.",
    ],
    scoreDimensions: [
      {
        competencyId: "vulnerability-assessment-testing",
        label: "Authorized testing",
        description: "Treats scope, data minimization, and stop conditions as part of technical quality.",
      },
      {
        competencyId: "risk-management",
        label: "Contextual priority",
        description: "Connects verified exposure and deployment context to proportionate urgency.",
      },
      {
        competencyId: "secure-engineering-architecture",
        label: "Durable remediation",
        description: "Pairs immediate mitigation with root-cause prevention and retesting.",
      },
    ],
    debriefQuestions: [
      "Why is a connected third-party system not automatically in scope?",
      "What is the minimum evidence needed to make this finding reproducible?",
      "How would your priority change if production used a different template?",
    ],
    safetyNote:
      "The target, route, records, and organization are fictional. Testing is framed only within explicit authorization; no exploit instructions or real targets are provided.",
  },
  {
    id: "audit-evidence-gap",
    title: "The evidence is not the control",
    subtitle: "Audit privileged access fairly when the deadline is close",
    summary:
      "A fictional payroll team says its quarterly privileged-access review is complete, but the evidence omits part of the population and several leavers remain enabled.",
    difficulty: "intermediate",
    estimatedMinutes: 19,
    familyIds: ["governance-risk-privacy", "leadership-strategy"],
    primaryRoleId: "it-auditor",
    supportingRoleIds: [
      "grc-analyst",
      "information-security-risk-manager",
      "information-security-manager",
    ],
    competencyIds: [
      "identity-access-management",
      "governance-compliance-audit",
      "risk-management",
      "leadership-communication",
    ],
    setting:
      "Juniper Transit is a fictional organization. Its payroll system, employees, evidence, and audit criteria exist only for this simulation.",
    learnerBrief:
      "You are the IT auditor. Determine whether the control is designed and operating effectively, give the owner a fair chance to provide evidence, and report any gap precisely.",
    objectives: [
      "Assess evidence relevance, reliability, completeness, and timeliness.",
      "Separate control failure, evidence gap, and isolated exception.",
      "Write a balanced finding and proportionate action.",
    ],
    actors: [
      {
        id: "marco",
        name: "Marco Silva",
        title: "Payroll platform owner",
        publicPosition: "Says the review happened and asks you to accept a manager's screenshot.",
        concern: "An audit issue could delay a payroll-system release.",
      },
      {
        id: "hana",
        name: "Hana Ito",
        title: "GRC analyst",
        publicPosition: "Can provide the control wording and prior remediation history.",
        concern: "The same population problem was raised informally last quarter.",
      },
      {
        id: "farah",
        name: "Farah Ali",
        title: "HR operations manager",
        publicPosition: "Can confirm termination dates from the authoritative HR record.",
        concern: "Employee details should be shared only as needed for the audit.",
      },
    ],
    evidence: [
      {
        id: "control-text",
        title: "Control objective and procedure",
        kind: "policy",
        content:
          "Quarterly, the payroll owner reviews the complete privileged-account population against active workers, approves justified access, and removes unauthorized access within five business days. Evidence must show population, reviewer, date, decisions, and completion.",
        significance:
          "The criteria define what must occur and what evidence should demonstrate, including completeness and timely removal.",
        initiallyVisible: true,
      },
      {
        id: "owner-screenshot",
        title: "Submitted evidence",
        kind: "email",
        content:
          "A cropped screenshot shows 18 approved named administrators and a date. It does not show service accounts, rejected entries, source population, reviewer identity, or removal evidence.",
        significance:
          "The screenshot may be relevant, but it is insufficient to establish a complete population or operation of the full control.",
        initiallyVisible: true,
      },
      {
        id: "independent-sample",
        title: "Auditor's reconciled sample",
        kind: "log",
        content:
          "A system-generated export contains 27 privileged accounts. Four belong to workers whose HR records show departure 12–46 days ago; two service accounts have no recorded owner.",
        significance:
          "Independent evidence contradicts the submitted population and indicates both timeliness and ownership gaps.",
        initiallyVisible: false,
      },
      {
        id: "management-response",
        title: "Management response",
        kind: "interview-note",
        content:
          "Marco agrees the screenshot was filtered, removes the four leaver accounts, assigns service-account owners, and proposes an automated HR-to-payroll reconciliation before each review.",
        significance:
          "Prompt correction reduces current exposure but does not erase the operating failure; the systemic proposal addresses root cause.",
        initiallyVisible: false,
      },
    ],
    decisionPoints: [
      {
        id: "audit-d1",
        phase: "assess",
        title: "Evaluate the screenshot",
        context: "The owner says the screenshot is standard evidence and the release deadline is tomorrow.",
        prompt: "What is your next audit step?",
        evidenceIds: ["control-text", "owner-screenshot"],
        options: [
          {
            id: "audit-d1-a",
            label: "Request the system-generated full population, reviewer decisions, HR reconciliation, and removal proof using the stated criteria.",
            quality: "strong",
            coachFeedback:
              "The request is specific, proportionate, and tied directly to control design and operation.",
            consequences: ["The evidence gap is tested fairly.", "The owner knows exactly what can resolve it."],
          },
          {
            id: "audit-d1-b",
            label: "Accept the screenshot because the owner is experienced and the deadline is close.",
            quality: "unsafe",
            coachFeedback:
              "Trust in a person does not replace sufficient evidence, and delivery pressure should not change the audit conclusion.",
            consequences: ["The incomplete population goes untested.", "Assurance may be misleading."],
          },
          {
            id: "audit-d1-c",
            label: "Issue a severe finding immediately without giving the owner a chance to provide complete evidence.",
            quality: "partial",
            coachFeedback:
              "The evidence is currently insufficient, but fair process includes a targeted follow-up before concluding the control failed.",
            consequences: ["The owner may challenge the process.", "Useful evidence could be missed."],
          },
        ],
        recommendedOptionId: "audit-d1-a",
      },
      {
        id: "audit-d2",
        phase: "assess",
        title: "Reach the conclusion",
        context: "The independent export contains nine more accounts and four leavers.",
        prompt: "How should you characterize the result?",
        evidenceIds: ["independent-sample"],
        options: [
          {
            id: "audit-d2-a",
            label: "Conclude the control did not operate effectively for the period, document population and removal gaps, and assess impact with the owner.",
            quality: "strong",
            coachFeedback:
              "The conclusion is traceable to criteria and evidence without overstating whether the dormant access was misused.",
            consequences: ["The finding is defensible.", "Risk can be assessed separately from unverified misuse."],
          },
          {
            id: "audit-d2-b",
            label: "Report that four former workers definitely accessed payroll data maliciously.",
            quality: "unsafe",
            coachFeedback:
              "Enabled access shows exposure, not proof of use or intent. The claim exceeds the evidence.",
            consequences: ["The report contains an unsupported allegation.", "Trust in the audit declines."],
          },
          {
            id: "audit-d2-c",
            label: "Mark the control effective because most named administrators were valid.",
            quality: "unsafe",
            coachFeedback:
              "The procedure requires a complete population and timely removal; the exceptions are central to the control objective.",
            consequences: ["Material exceptions are hidden.", "The root cause remains untreated."],
          },
        ],
        recommendedOptionId: "audit-d2-a",
      },
      {
        id: "audit-d3",
        phase: "improve",
        title: "Agree the corrective action",
        context: "Current accounts are corrected, but the population was built manually and filtered.",
        prompt: "Which action best addresses the finding?",
        evidenceIds: ["management-response"],
        options: [
          {
            id: "audit-d3-a",
            label: "Require an authoritative full export, automated HR reconciliation, recorded reviewer decisions, exception follow-up, and effectiveness validation.",
            quality: "strong",
            coachFeedback:
              "This addresses root cause, evidence quality, and future operating effectiveness rather than only today's exceptions.",
            consequences: ["The review becomes more complete and repeatable.", "Closure can be tested objectively."],
          },
          {
            id: "audit-d3-b",
            label: "Close the finding immediately because the four accounts were removed during fieldwork.",
            quality: "partial",
            coachFeedback:
              "Correction reduces current exposure, but closure also requires confidence that the control will operate reliably.",
            consequences: ["Immediate exposure falls.", "The manual population flaw may recur."],
          },
          {
            id: "audit-d3-c",
            label: "Tell the auditor to redesign and operate the payroll control for management.",
            quality: "unsafe",
            coachFeedback:
              "The auditor can recommend outcomes but should preserve management ownership and audit independence.",
            consequences: ["Accountability becomes blurred.", "Audit independence may be weakened."],
          },
        ],
        recommendedOptionId: "audit-d3-a",
      },
    ],
    idealResponseSteps: [
      "Anchor the test in the documented objective, procedure, population, and period.",
      "Assess whether submitted evidence is relevant, reliable, complete, and timely.",
      "Perform a targeted reconciliation to independent system and HR sources.",
      "Discuss factual exceptions and context with the owner before finalizing.",
      "Write condition, criteria, cause, impact, and proportionate action without unsupported claims.",
      "Validate both immediate correction and sustainable operating effectiveness before closure.",
    ],
    scoreDimensions: [
      {
        competencyId: "governance-compliance-audit",
        label: "Evidence quality",
        description: "Tests the full control against clear criteria using sufficient evidence.",
      },
      {
        competencyId: "risk-management",
        label: "Balanced conclusion",
        description: "Explains exposure and impact without claiming unverified misuse.",
      },
      {
        competencyId: "leadership-communication",
        label: "Fair challenge",
        description: "Gives the owner a precise request and preserves accountability and independence.",
      },
    ],
    debriefQuestions: [
      "When is missing evidence different from evidence that a control failed?",
      "Why does prompt remediation not automatically close the audit finding?",
      "How would you keep employee data minimized during this test?",
    ],
    safetyNote:
      "All organizations, accounts, names, and audit records are fictional. The scenario teaches control assurance and does not provide legal or regulatory conclusions.",
  },
  {
    id: "privacy-vendor-review",
    title: "Design the wellness integration",
    subtitle: "Architect a useful service without collecting everything",
    summary:
      "A fictional employer wants an AI-assisted wellness vendor. Design a privacy-conscious integration across collection, access, retention, support, and deletion.",
    difficulty: "intermediate",
    estimatedMinutes: 21,
    familyIds: ["engineering-architecture", "governance-risk-privacy"],
    primaryRoleId: "principal-security-architect",
    supportingRoleIds: [
      "privacy-analyst",
      "cybersecurity-engineer",
      "information-security-risk-manager",
    ],
    competencyIds: [
      "privacy-data-protection",
      "identity-access-management",
      "secure-engineering-architecture",
      "risk-management",
      "leadership-communication",
    ],
    setting:
      "Cedar & Finch and the BrightWell service are fictional. The exercise uses invented data flows and makes no jurisdiction-specific legal determination.",
    learnerBrief:
      "You are the principal security architect facilitating design review. Partner with privacy, legal, product, and engineering; minimize data while preserving the intended employee benefit.",
    objectives: [
      "Map purpose, data, actors, transfers, retention, access, and deletion.",
      "Apply minimization, separation, least privilege, and verifiable deletion.",
      "Separate architecture advice from questions requiring privacy counsel.",
    ],
    actors: [
      {
        id: "luca",
        name: "Luca Meyer",
        title: "People product manager",
        publicPosition: "Wants a fast, personalized launch with executive engagement dashboards.",
        concern: "A heavily restricted design may reduce adoption and reporting value.",
      },
      {
        id: "meera",
        name: "Meera Shah",
        title: "Privacy analyst",
        publicPosition: "Asks whether identity, free-text wellness entries, and manager reports are truly necessary.",
        concern: "Employees may feel pressured or be affected by sensitive inferences.",
      },
      {
        id: "sam",
        name: "Sam Adeyemi",
        title: "Vendor solutions engineer",
        publicPosition: "Says the service can retain prompts indefinitely to improve personalization.",
        concern: "Custom retention and deletion verification require additional configuration.",
      },
      {
        id: "ruth",
        name: "Ruth Kim",
        title: "Employment counsel",
        publicPosition: "Will advise on purpose, transparency, employee choice, and regional requirements.",
        concern: "The team must not treat technical safeguards as the only privacy question.",
      },
    ],
    evidence: [
      {
        id: "product-brief",
        title: "Product proposal",
        kind: "architecture-note",
        content:
          "Proposed flow sends employee name, work email, department, location, free-text wellness journal, and manager identity to BrightWell. Managers receive named engagement and mood summaries.",
        significance:
          "The design collects and exposes more identifiable, sensitive context than the stated goal of voluntary personal coaching appears to require.",
        initiallyVisible: true,
      },
      {
        id: "vendor-terms",
        title: "Vendor design responses",
        kind: "policy",
        content:
          "Default retention is indefinite; support engineers can view submitted text; deletion is available by ticket; customer data is not needed to train the shared model when that setting is disabled.",
        significance:
          "Defaults create retention and access risk, but configurable controls offer concrete design choices that must be verified contractually and technically.",
        initiallyVisible: false,
      },
      {
        id: "data-map",
        title: "Minimized data-flow option",
        kind: "architecture-note",
        content:
          "Use pseudonymous employee IDs, omit department and manager identity, keep journal text out of employer systems, return only aggregated participation metrics above a minimum group size, and delete content after 30 days unless the employee chooses a shorter period.",
        significance:
          "The alternative separates coaching from employment reporting and reduces linkability, access, and retention while preserving core service value.",
        initiallyVisible: false,
      },
      {
        id: "review-actions",
        title: "Open review actions",
        kind: "risk-register",
        content:
          "Privacy counsel: validate purpose, notice, choice, rights, and regional conditions. Vendor owner: confirm subprocessors and contract terms. Engineering: test access, isolation, retention, export, and deletion. Product: validate aggregate reporting need.",
        significance:
          "The decisions are divided among the right accountable specialists instead of being treated as architecture-only questions.",
        initiallyVisible: false,
      },
    ],
    decisionPoints: [
      {
        id: "privacy-d1",
        phase: "assess",
        title: "Challenge the data request",
        context: "The product brief proposes named manager dashboards and indefinite journal history.",
        prompt: "How do you begin the design review?",
        evidenceIds: ["product-brief"],
        options: [
          {
            id: "privacy-d1-a",
            label: "Clarify purpose and affected people, map each data item and recipient, and ask for the minimum needed for each feature.",
            quality: "strong",
            coachFeedback:
              "Starting with purpose and flow reveals whether collection, linkage, reporting, and retention are proportionate.",
            consequences: ["Unnecessary fields become visible.", "The team can compare lower-data designs."],
          },
          {
            id: "privacy-d1-b",
            label: "Approve all fields because encryption will protect them.",
            quality: "unsafe",
            coachFeedback:
              "Encryption is important but does not answer whether the data should be collected, linked, shown, or retained.",
            consequences: ["Collection remains excessive.", "Misuse and human-impact questions remain open."],
          },
          {
            id: "privacy-d1-c",
            label: "Reject any wellness service because sensitive data can never be used responsibly.",
            quality: "partial",
            coachFeedback:
              "Risk may be significant, but the review should test whether purpose, choice, minimization, separation, and safeguards can make a proportionate design.",
            consequences: ["Potential benefit is discarded without analysis.", "Stakeholders learn little about safer alternatives."],
          },
        ],
        recommendedOptionId: "privacy-d1-a",
      },
      {
        id: "privacy-d2",
        phase: "assess",
        title: "Choose the architecture",
        context: "The vendor offers configurable access, retention, and model-training settings.",
        prompt: "Which design do you recommend for review?",
        evidenceIds: ["vendor-terms", "data-map"],
        options: [
          {
            id: "privacy-d2-a",
            label: "Use pseudonymous IDs, employee-controlled retention, isolated journal content, tightly limited support, no shared-model training, and thresholded aggregates.",
            quality: "strong",
            coachFeedback:
              "The design reduces collection, linkability, access, retention, and employment impact while keeping the coaching use case.",
            consequences: ["Privacy exposure falls.", "Controls become concrete and testable."],
          },
          {
            id: "privacy-d2-b",
            label: "Keep vendor defaults and rely on employees to read a long notice.",
            quality: "unsafe",
            coachFeedback:
              "Notice alone does not correct excessive collection, broad access, indefinite retention, or power imbalance.",
            consequences: ["Sensitive data accumulates.", "Employee trust and impact risk increase."],
          },
          {
            id: "privacy-d2-c",
            label: "Send named mood summaries to managers but hide the journal text.",
            quality: "partial",
            coachFeedback:
              "Removing text helps, but named sensitive inferences can still affect employees and may not be necessary for the stated purpose.",
            consequences: ["Some content exposure falls.", "Employment-impact risk remains."],
          },
        ],
        recommendedOptionId: "privacy-d2-a",
      },
      {
        id: "privacy-d3",
        phase: "communicate",
        title: "Set approval conditions",
        context: "Product asks you to sign off before counsel and control tests are complete.",
        prompt: "How do you respond?",
        evidenceIds: ["review-actions"],
        options: [
          {
            id: "privacy-d3-a",
            label: "Document conditional architecture approval, route legal questions to counsel, assign vendor and engineering tests, and require closure before launch.",
            quality: "strong",
            coachFeedback:
              "This keeps technical judgment in scope while making cross-functional accountability and launch conditions explicit.",
            consequences: ["Open risks have owners.", "Approval depends on verified conditions rather than promises."],
          },
          {
            id: "privacy-d3-b",
            label: "Give final privacy and legal approval because the architecture now uses encryption.",
            quality: "unsafe",
            coachFeedback:
              "An architect should not claim legal conclusions, and encryption does not close purpose, choice, rights, or contract questions.",
            consequences: ["Unqualified conclusions enter the decision record.", "Important obligations may remain open."],
          },
          {
            id: "privacy-d3-c",
            label: "Leave every open item unowned and ask the team to revisit after launch.",
            quality: "unsafe",
            coachFeedback:
              "Privacy-by-design work is most effective before data collection begins; launch without ownership converts questions into exposure.",
            consequences: ["Data is collected before controls are verified.", "Remediation becomes harder."],
          },
        ],
        recommendedOptionId: "privacy-d3-a",
      },
    ],
    idealResponseSteps: [
      "Clarify purpose, affected people, value, assumptions, and accountable owners.",
      "Map collection, transfers, access, inference, reporting, retention, export, and deletion.",
      "Remove unnecessary identifiers and fields; separate personal coaching from employer reporting.",
      "Define least privilege, isolation, training settings, retention, deletion, monitoring, and incident duties.",
      "Route legal and employment-impact questions to qualified counsel and privacy owners.",
      "Make approval conditional on contracts, technical tests, transparent communication, and owned residual risk.",
    ],
    scoreDimensions: [
      {
        competencyId: "privacy-data-protection",
        label: "Data lifecycle reasoning",
        description: "Examines purpose, people, collection, access, retention, rights, and deletion end to end.",
      },
      {
        competencyId: "secure-engineering-architecture",
        label: "Privacy-conscious design",
        description: "Uses minimization, separation, least privilege, verifiable controls, and safe defaults.",
      },
      {
        competencyId: "leadership-communication",
        label: "Bounded advice",
        description: "States architecture judgment clearly and routes legal conclusions to qualified owners.",
      },
    ],
    debriefQuestions: [
      "Which proposed field was hardest to justify against the product purpose?",
      "Why are encryption and notice insufficient on their own?",
      "What evidence would you require before approving deletion and access controls?",
    ],
    safetyNote:
      "The company, vendor, people, and data are fictional. This is an architecture and privacy-risk exercise, not jurisdiction-specific legal advice.",
  },
  {
    id: "board-risk-briefing",
    title: "Seven minutes with the board",
    subtitle: "Turn a supplier-access risk into a decision, not a dashboard tour",
    summary:
      "A fictional CISO must explain rising supplier remote-access exposure and recommend a staged investment while answering direct questions about safety and accountability.",
    difficulty: "advanced",
    estimatedMinutes: 22,
    familyIds: ["leadership-strategy", "governance-risk-privacy", "engineering-architecture"],
    primaryRoleId: "ciso",
    supportingRoleIds: [
      "information-security-manager",
      "cybersecurity-manager",
      "information-security-risk-manager",
      "principal-security-architect",
    ],
    competencyIds: [
      "risk-management",
      "governance-compliance-audit",
      "identity-access-management",
      "secure-engineering-architecture",
      "leadership-communication",
    ],
    setting:
      "Meridian Foods is a fictional international food distributor. Its board, suppliers, access platform, metrics, and budget are invented.",
    learnerBrief:
      "You are the CISO. The board needs the business exposure, trajectory, choices, recommendation, and decision—not a list of technical activities.",
    objectives: [
      "Translate control evidence into a specific business risk scenario.",
      "Compare investment options with assumptions and residual risk.",
      "Answer executive challenge without false precision or guarantees.",
    ],
    actors: [
      {
        id: "chair",
        name: "Elena Rossi",
        title: "Board chair",
        publicPosition: "Asks whether the company is safe and who owns the decision.",
        concern: "Clear accountability and protection of customer and operational trust.",
      },
      {
        id: "cfo",
        name: "David Mensah",
        title: "Chief financial officer",
        publicPosition: "Supports risk reduction but challenges recurring cost and delivery capacity.",
        concern: "Funding the most valuable work without overcommitting scarce teams.",
      },
      {
        id: "coo",
        name: "Priya Nair",
        title: "Chief operating officer",
        publicPosition: "Warns that suppliers need urgent access to maintain warehouses.",
        concern: "New controls must preserve emergency maintenance and accountability.",
      },
      {
        id: "risk",
        name: "Thomas Green",
        title: "Board risk chair",
        publicPosition: "Asks how management knows the recommendation will work.",
        concern: "Independent evidence, measurable outcomes, and residual-risk ownership.",
      },
    ],
    evidence: [
      {
        id: "board-risk",
        title: "Risk statement",
        kind: "risk-register",
        content:
          "Because suppliers retain standing remote access into warehouse support systems, a compromised supplier identity could disrupt distribution or expose order data. Current ownership and session evidence are incomplete.",
        significance:
          "The statement links a control condition to a credible event and business impact without asserting that a breach has occurred.",
        initiallyVisible: true,
      },
      {
        id: "board-metrics",
        title: "Control evidence and trend",
        kind: "executive-brief",
        content:
          "61 of 214 supplier accounts lack a current business owner; 38 have not been used in 90 days; multifactor coverage is 72%; quarterly access reviews are two cycles overdue. No confirmed supplier-origin incident this year.",
        significance:
          "The evidence shows weakening control health and exposure, while avoiding a false claim that poor control health equals a confirmed incident.",
        initiallyVisible: true,
      },
      {
        id: "board-options",
        title: "Management options",
        kind: "executive-brief",
        content:
          "Option A: ownership cleanup and multifactor enforcement in 60 days. Option B: add time-bound, approved access and session logging over two quarters. Option C: combine A and B, starting with 24 critical suppliers, plus quarterly independent control validation. C costs more and needs two engineers reassigned.",
        significance:
          "The options expose timing, coverage, resource, and assurance trade-offs instead of presenting one unexplained budget ask.",
        initiallyVisible: false,
      },
      {
        id: "board-target",
        title: "Proposed outcome measures",
        kind: "executive-brief",
        content:
          "Within 60 days: 100% named ownership and multifactor coverage for critical suppliers. Within two quarters: 95% of supplier sessions time-bound and logged; emergency access tested quarterly; overdue reviews eliminated; exceptions accepted by accountable executives.",
        significance:
          "Outcome and control-health measures let management and the board track whether investment changes exposure.",
        initiallyVisible: false,
      },
    ],
    decisionPoints: [
      {
        id: "board-d1",
        phase: "communicate",
        title: "Open the briefing",
        context: "You have seven minutes before questions.",
        prompt: "How do you frame the issue?",
        evidenceIds: ["board-risk", "board-metrics"],
        options: [
          {
            id: "board-d1-a",
            label: "Lead with the supplier-access risk, business impact, worsening control evidence, current actions, recommendation, and decision required.",
            quality: "strong",
            coachFeedback:
              "This gives the board a decision narrative while keeping evidence and uncertainty visible.",
            consequences: ["The board understands why the issue matters.", "Question time can focus on choices and assurance."],
          },
          {
            id: "board-d1-b",
            label: "Walk through every tool alert and technical vulnerability before mentioning the business risk.",
            quality: "partial",
            coachFeedback:
              "Technical detail may support follow-up, but it obscures the decision the board must govern.",
            consequences: ["Time is consumed.", "The decision and ask arrive late or not at all."],
          },
          {
            id: "board-d1-c",
            label: "Say a catastrophic supplier breach is certain unless the budget is approved today.",
            quality: "unsafe",
            coachFeedback:
              "Fear and false certainty weaken credibility. Evidence supports material exposure, not certainty of a specific event.",
            consequences: ["Trust in the analysis declines.", "The board may focus on the exaggeration instead of the risk."],
          },
        ],
        recommendedOptionId: "board-d1-a",
      },
      {
        id: "board-d2",
        phase: "assess",
        title: "Recommend the investment",
        context: "The CFO asks why basic account cleanup is not enough.",
        prompt: "Which recommendation best explains the trade-off?",
        evidenceIds: ["board-options", "board-target"],
        options: [
          {
            id: "board-d2-a",
            label: "Recommend the combined staged plan, explain immediate cleanup versus durable access controls, name delivery dependencies, and show residual risk if phases stop.",
            quality: "strong",
            coachFeedback:
              "The answer distinguishes quick exposure reduction from sustainable control and makes capacity and residual-risk choices explicit.",
            consequences: ["Executives can decide with clear trade-offs.", "Progress can be tracked against outcomes."],
          },
          {
            id: "board-d2-b",
            label: "Promise the combined plan eliminates all supplier cyber risk.",
            quality: "unsafe",
            coachFeedback:
              "Controls reduce risk; they do not guarantee elimination. A promise hides residual risk and assurance needs.",
            consequences: ["Expectations become unrealistic.", "Future incidents may appear to invalidate the whole program."],
          },
          {
            id: "board-d2-c",
            label: "Ask the board to choose among the technical options without a management recommendation.",
            quality: "partial",
            coachFeedback:
              "Management should recommend a course and explain alternatives; the board governs and challenges rather than designs the control.",
            consequences: ["Accountability becomes blurred.", "The decision may stall."],
          },
        ],
        recommendedOptionId: "board-d2-a",
      },
      {
        id: "board-d3",
        phase: "communicate",
        title: "Answer 'Are we safe?'",
        context: "The board chair asks for a yes-or-no answer.",
        prompt: "How do you respond directly without making a guarantee?",
        evidenceIds: ["board-risk", "board-target"],
        options: [
          {
            id: "board-d3-a",
            label: "Say the exposure is above management's desired level, summarize current safeguards and gaps, state the recommended trajectory, and name the risk owner and review point.",
            quality: "strong",
            coachFeedback:
              "This answers the underlying governance question: current position, evidence, direction, accountability, and next assurance point.",
            consequences: ["The board receives an honest assessment.", "Ownership and follow-up are explicit."],
          },
          {
            id: "board-d3-b",
            label: "Answer 'yes' because the company has not had a confirmed supplier incident this year.",
            quality: "unsafe",
            coachFeedback:
              "Past incident absence does not prove current controls or acceptable exposure.",
            consequences: ["The board receives false assurance.", "Known evidence gaps are minimized."],
          },
          {
            id: "board-d3-c",
            label: "Answer only that cybersecurity can never be safe and decline to discuss current exposure.",
            quality: "partial",
            coachFeedback:
              "Absolute safety is impossible, but leaders still need a clear view of whether current exposure is acceptable and improving.",
            consequences: ["The literal statement is true but unhelpful.", "The governance question remains unanswered."],
          },
        ],
        recommendedOptionId: "board-d3-a",
      },
    ],
    idealResponseSteps: [
      "Define the business-relevant risk scenario and distinguish exposure from a confirmed event.",
      "Show control health, trend, assumptions, and evidence gaps in a few decision-useful measures.",
      "Present options with timing, dependencies, cost, expected reduction, and residual risk.",
      "Give management's recommendation and a precise board or executive decision request.",
      "State accountable risk ownership, outcome measures, assurance approach, and review date.",
      "Answer challenge directly, honestly, and without guarantees or invented precision.",
    ],
    scoreDimensions: [
      {
        competencyId: "risk-management",
        label: "Decision framing",
        description: "Connects condition, event, impact, options, assumptions, and residual risk.",
      },
      {
        competencyId: "governance-compliance-audit",
        label: "Evidence and assurance",
        description: "Uses meaningful control evidence, targets, ownership, and independent validation.",
      },
      {
        competencyId: "leadership-communication",
        label: "Executive influence",
        description: "Leads with relevance, recommends clearly, and answers challenge without false certainty.",
      },
    ],
    debriefQuestions: [
      "Which metrics belong in the board pack, and which belong in management operations?",
      "What residual risk remains after the combined plan?",
      "How can the CISO stay accountable without owning every business risk decision?",
    ],
    safetyNote:
      "The company, suppliers, metrics, systems, and board are fictional. This scenario supports governance practice and does not predict real-world loss or guarantee control effectiveness.",
  },
];
