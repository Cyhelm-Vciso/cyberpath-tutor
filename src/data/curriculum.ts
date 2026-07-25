import type {
  CareerFamily,
  CareerRole,
  CoreCompetency,
  LearningModule,
} from "../domain/types";

export const careerFamilies: readonly CareerFamily[] = [
  {
    id: "leadership-strategy",
    title: "Leadership & Security Strategy",
    shortTitle: "Lead",
    description:
      "Turn technical realities into priorities, investment decisions, operating models, and accountable security outcomes.",
    outcome:
      "Build and communicate a security program that supports the business while making risk ownership explicit.",
    icon: "compass",
    accentColor: "#8B5CF6",
    roleIds: [
      "cybersecurity-consultant",
      "information-security-manager",
      "cybersecurity-manager",
      "ciso",
    ],
  },
  {
    id: "security-operations",
    title: "Security Operations & Threat Detection",
    shortTitle: "Detect",
    description:
      "Monitor environments, validate alerts, hunt for hidden threats, and continuously improve detection coverage.",
    outcome:
      "Move from a noisy signal to a defensible investigation and a measurable improvement in detection capability.",
    icon: "radar",
    accentColor: "#06B6D4",
    roleIds: ["soc-analyst", "threat-hunter", "soc-manager"],
  },
  {
    id: "incident-response-forensics",
    title: "Incident Response & Digital Forensics",
    shortTitle: "Respond",
    description:
      "Coordinate incidents, contain harm, preserve evidence, determine what happened, and guide safe recovery.",
    outcome:
      "Run an evidence-led response from first report through lessons learned without losing control of communications.",
    icon: "siren",
    accentColor: "#F97316",
    roleIds: [
      "incident-responder",
      "digital-forensics-examiner",
      "incident-commander",
    ],
  },
  {
    id: "engineering-architecture",
    title: "Security Engineering & Architecture",
    shortTitle: "Build",
    description:
      "Design, implement, and validate resilient controls across applications, identity, endpoints, networks, and cloud.",
    outcome:
      "Translate threat and business requirements into secure, operable systems with clear trade-offs.",
    icon: "blocks",
    accentColor: "#3B82F6",
    roleIds: ["cybersecurity-engineer", "principal-security-architect"],
  },
  {
    id: "offensive-vulnerability",
    title: "Offensive Security & Vulnerability Management",
    shortTitle: "Test",
    description:
      "Find, validate, prioritize, and clearly explain weaknesses within an explicitly authorized scope.",
    outcome:
      "Produce reproducible, risk-ranked findings that help system owners fix the issues that matter most.",
    icon: "crosshair",
    accentColor: "#EF4444",
    roleIds: ["junior-penetration-tester", "vulnerability-assessment-analyst"],
  },
  {
    id: "governance-risk-privacy",
    title: "Governance, Risk, Audit & Privacy",
    shortTitle: "Govern",
    description:
      "Define expectations, test evidence, advise risk owners, and protect personal data across its lifecycle.",
    outcome:
      "Connect obligations and control evidence to decisions the organization can own, fund, and verify.",
    icon: "scale",
    accentColor: "#10B981",
    roleIds: [
      "grc-analyst",
      "it-auditor",
      "privacy-analyst",
      "information-security-risk-manager",
    ],
  },
];

export const coreCompetencies: readonly CoreCompetency[] = [
  {
    id: "security-foundations",
    title: "Security foundations",
    description:
      "Reason about assets, threats, vulnerabilities, controls, trust boundaries, and confidentiality, integrity, and availability.",
    outcomes: [
      "Describe a system in assets, actors, data flows, and trust boundaries.",
      "Distinguish a threat event, vulnerability, control gap, and business impact.",
      "Choose proportionate preventive, detective, and corrective controls.",
    ],
    evidenceOfSkill: [
      "A one-page threat model",
      "A control-to-risk mapping with assumptions",
    ],
    familyIds: [
      "leadership-strategy",
      "security-operations",
      "incident-response-forensics",
      "engineering-architecture",
      "offensive-vulnerability",
      "governance-risk-privacy",
    ],
  },
  {
    id: "network-cloud-security",
    title: "Network, endpoint & cloud security",
    description:
      "Understand how systems communicate and how segmentation, configuration, telemetry, and cloud responsibility models reduce exposure.",
    outcomes: [
      "Trace a request across endpoint, DNS, network, identity, application, and cloud layers.",
      "Identify high-value telemetry and common configuration weaknesses.",
      "Recommend layered controls without assuming a single product solves the risk.",
    ],
    evidenceOfSkill: ["A labeled data-flow diagram", "A hardened baseline review"],
    familyIds: [
      "security-operations",
      "incident-response-forensics",
      "engineering-architecture",
      "offensive-vulnerability",
    ],
  },
  {
    id: "identity-access-management",
    title: "Identity & access management",
    description:
      "Apply least privilege, strong authentication, lifecycle governance, and privileged access controls to human and machine identities.",
    outcomes: [
      "Explain authentication, authorization, federation, and session risk.",
      "Review joiner, mover, leaver and privileged-access workflows.",
      "Investigate identity activity without equating one alert with compromise.",
    ],
    evidenceOfSkill: ["An access review", "An identity incident decision tree"],
    familyIds: [
      "security-operations",
      "incident-response-forensics",
      "engineering-architecture",
      "governance-risk-privacy",
    ],
  },
  {
    id: "security-operations-detection",
    title: "Security operations & detection",
    description:
      "Triage alerts, form and test hypotheses, correlate telemetry, document confidence, and improve detection logic.",
    outcomes: [
      "Prioritize an alert using asset criticality, evidence quality, and likely impact.",
      "Build an investigation timeline and separate facts from assumptions.",
      "Recommend a tuning or coverage improvement after closure.",
    ],
    evidenceOfSkill: ["A timestamped case record", "A detection coverage note"],
    familyIds: ["security-operations", "incident-response-forensics"],
  },
  {
    id: "threat-intelligence-hunting",
    title: "Threat intelligence & hunting",
    description:
      "Convert relevant threat knowledge into testable hypotheses while tracking source reliability, confidence, and gaps.",
    outcomes: [
      "Assess whether intelligence is timely, relevant, and actionable.",
      "Design a bounded hunt with a hypothesis, data requirements, and stopping rule.",
      "Convert hunt results into detections, mitigations, or a documented null result.",
    ],
    evidenceOfSkill: ["A hunt plan", "An intelligence confidence assessment"],
    familyIds: [
      "security-operations",
      "incident-response-forensics",
      "engineering-architecture",
    ],
  },
  {
    id: "incident-response-forensics",
    title: "Incident response & forensics",
    description:
      "Scope, contain, investigate, communicate, recover, and learn while preserving evidence and decision accountability.",
    outcomes: [
      "Select reversible containment based on impact and confidence.",
      "Maintain a reliable timeline, evidence notes, and chain of custody.",
      "Define recovery checks and turn lessons into owned actions.",
    ],
    evidenceOfSkill: ["An incident action plan", "A post-incident review"],
    familyIds: [
      "security-operations",
      "incident-response-forensics",
      "leadership-strategy",
    ],
  },
  {
    id: "vulnerability-assessment-testing",
    title: "Vulnerability assessment & authorized testing",
    description:
      "Plan safe testing, validate weaknesses, consider exploitability and exposure, and write remediation-focused findings.",
    outcomes: [
      "Confirm written scope, rules of engagement, and stop conditions.",
      "Validate findings safely and minimize collection of sensitive data.",
      "Prioritize by business context rather than scanner severity alone.",
    ],
    evidenceOfSkill: ["A rules-of-engagement brief", "A reproducible finding report"],
    familyIds: [
      "offensive-vulnerability",
      "engineering-architecture",
      "governance-risk-privacy",
    ],
  },
  {
    id: "secure-engineering-architecture",
    title: "Secure engineering & architecture",
    description:
      "Turn security requirements and threat models into maintainable designs, automation, guardrails, and validation plans.",
    outcomes: [
      "Document trust boundaries and meaningful abuse cases.",
      "Compare design options using security, reliability, cost, and operability.",
      "Define testable requirements and ownership for control health.",
    ],
    evidenceOfSkill: ["An architecture decision record", "A control validation plan"],
    familyIds: [
      "engineering-architecture",
      "offensive-vulnerability",
      "leadership-strategy",
    ],
  },
  {
    id: "governance-compliance-audit",
    title: "Governance, compliance & audit",
    description:
      "Translate obligations into policies and controls, test evidence objectively, and track gaps to accountable closure.",
    outcomes: [
      "Map an obligation to a clear control objective and owner.",
      "Evaluate evidence for design and operating effectiveness.",
      "Write a fair finding with condition, criteria, cause, impact, and action.",
    ],
    evidenceOfSkill: ["A control test worksheet", "A corrective-action record"],
    familyIds: ["governance-risk-privacy", "leadership-strategy"],
  },
  {
    id: "risk-management",
    title: "Information security risk management",
    description:
      "Express uncertainty in business terms, compare treatment choices, and make risk ownership and review dates explicit.",
    outcomes: [
      "Write a specific risk scenario with cause, event, asset, and impact.",
      "Estimate likelihood and impact with transparent assumptions.",
      "Present avoid, reduce, transfer, and accept options to the right owner.",
    ],
    evidenceOfSkill: ["A risk register entry", "A treatment recommendation"],
    familyIds: [
      "governance-risk-privacy",
      "leadership-strategy",
      "engineering-architecture",
    ],
  },
  {
    id: "privacy-data-protection",
    title: "Privacy & data protection",
    description:
      "Understand data lifecycles, lawful purpose, minimization, retention, data-subject impact, and third-party privacy risk.",
    outcomes: [
      "Map personal data from collection through deletion.",
      "Identify privacy risks and design practical mitigations.",
      "Escalate jurisdiction-specific legal questions to qualified counsel.",
    ],
    evidenceOfSkill: ["A data inventory", "A privacy impact assessment"],
    familyIds: [
      "governance-risk-privacy",
      "engineering-architecture",
      "leadership-strategy",
    ],
  },
  {
    id: "leadership-communication",
    title: "Leadership, communication & influence",
    description:
      "Lead calm decisions, tailor messages to the audience, negotiate trade-offs, and establish clear ownership under uncertainty.",
    outcomes: [
      "Give concise updates that distinguish facts, assumptions, decisions, and asks.",
      "Facilitate disagreement without hiding risk or overstating certainty.",
      "Define outcomes, owners, measures, and follow-up dates.",
    ],
    evidenceOfSkill: ["A three-minute executive briefing", "A decision log"],
    familyIds: [
      "leadership-strategy",
      "security-operations",
      "incident-response-forensics",
      "engineering-architecture",
      "offensive-vulnerability",
      "governance-risk-privacy",
    ],
  },
];

export const roles: readonly CareerRole[] = [
  {
    id: "cybersecurity-consultant",
    title: "Cybersecurity Consultant",
    familyId: "leadership-strategy",
    level: "mid-career",
    levelOrder: 3,
    summary:
      "Diagnoses client security problems and turns evidence into practical, context-aware recommendations.",
    mission:
      "Create clarity for a client without pretending that a framework or product replaces judgment.",
    typicalResponsibilities: [
      "Frame objectives, scope, assumptions, and stakeholders before assessing.",
      "Interview teams, review evidence, and compare current and target states.",
      "Present prioritized options, dependencies, cost considerations, and a delivery roadmap.",
    ],
    successSignals: [
      "Recommendations are adopted because owners understand the trade-offs.",
      "Reports distinguish verified evidence, professional judgment, and open questions.",
    ],
    recommendedCompetencyIds: [
      "security-foundations",
      "governance-compliance-audit",
      "risk-management",
      "secure-engineering-architecture",
      "leadership-communication",
    ],
    prerequisites: [
      {
        kind: "experience",
        description: "Breadth in at least one security delivery or assurance discipline.",
        minimumYears: 3,
        required: false,
      },
      {
        kind: "portfolio",
        description: "A sanitized assessment, roadmap, or advisory presentation.",
        required: false,
      },
    ],
    progression: {
      commonPriorRoleIds: [
        "grc-analyst",
        "it-auditor",
        "cybersecurity-engineer",
        "vulnerability-assessment-analyst",
      ],
      nextRoleIds: [
        "information-security-manager",
        "information-security-risk-manager",
        "principal-security-architect",
      ],
      lateralRoleIds: ["cybersecurity-manager", "privacy-analyst"],
    },
  },
  {
    id: "information-security-manager",
    title: "Information Security Manager",
    familyId: "leadership-strategy",
    level: "senior",
    levelOrder: 4,
    summary:
      "Runs a security program or portfolio, aligning policy, assurance, people, and delivery to organizational risk.",
    mission:
      "Make security work repeatable, owned, measurable, and connected to business priorities.",
    typicalResponsibilities: [
      "Set program objectives, policies, operating rhythms, and performance measures.",
      "Prioritize remediation and improvement work across accountable owners.",
      "Develop staff and brief senior leaders on material risk and progress.",
    ],
    successSignals: [
      "Program measures show reduced exposure or faster, more reliable control performance.",
      "Exceptions and accepted risks have named owners, rationale, and review dates.",
    ],
    recommendedCompetencyIds: [
      "security-foundations",
      "governance-compliance-audit",
      "risk-management",
      "privacy-data-protection",
      "leadership-communication",
    ],
    prerequisites: [
      {
        kind: "role-experience",
        roleIds: [
          "grc-analyst",
          "it-auditor",
          "cybersecurity-consultant",
          "privacy-analyst",
        ],
        description: "Repeated ownership of security work across multiple stakeholders.",
        required: false,
      },
      {
        kind: "experience",
        description: "Experience managing priorities, budgets, vendors, or people.",
        minimumYears: 5,
        required: false,
      },
    ],
    progression: {
      commonPriorRoleIds: [
        "grc-analyst",
        "it-auditor",
        "cybersecurity-consultant",
        "privacy-analyst",
      ],
      nextRoleIds: ["ciso"],
      lateralRoleIds: [
        "cybersecurity-manager",
        "information-security-risk-manager",
        "incident-commander",
      ],
    },
  },
  {
    id: "cybersecurity-manager",
    title: "Cybersecurity Manager",
    familyId: "leadership-strategy",
    level: "senior",
    levelOrder: 4,
    summary:
      "Leads technical security capabilities such as operations, engineering, vulnerability management, or architecture.",
    mission:
      "Help technical teams deliver dependable security outcomes while balancing coverage, speed, cost, and resilience.",
    typicalResponsibilities: [
      "Set capability roadmaps, service levels, staffing, and delivery priorities.",
      "Resolve cross-team technical risks and escalate decisions with clear options.",
      "Measure control health, operational load, and improvement outcomes.",
    ],
    successSignals: [
      "Teams spend more time reducing meaningful risk and less time on avoidable toil.",
      "Leaders can see capability gaps, commitments, and residual risk.",
    ],
    recommendedCompetencyIds: [
      "security-operations-detection",
      "incident-response-forensics",
      "secure-engineering-architecture",
      "risk-management",
      "leadership-communication",
    ],
    prerequisites: [
      {
        kind: "role-experience",
        roleIds: [
          "soc-manager",
          "cybersecurity-engineer",
          "incident-commander",
          "principal-security-architect",
        ],
        description: "Technical delivery leadership in one or more security capabilities.",
        required: false,
      },
      {
        kind: "portfolio",
        description: "Evidence of a measurable capability or process improvement.",
        required: false,
      },
    ],
    progression: {
      commonPriorRoleIds: [
        "soc-manager",
        "cybersecurity-engineer",
        "incident-commander",
        "principal-security-architect",
      ],
      nextRoleIds: ["ciso"],
      lateralRoleIds: ["information-security-manager", "information-security-risk-manager"],
    },
  },
  {
    id: "ciso",
    title: "Chief Information Security Officer (CISO)",
    familyId: "leadership-strategy",
    level: "executive",
    levelOrder: 5,
    summary:
      "Owns the enterprise security vision, operating model, executive communication, and informed escalation of material cyber risk.",
    mission:
      "Enable the organization to take well-informed risk while protecting trust, resilience, and long-term value.",
    typicalResponsibilities: [
      "Set strategy, risk appetite recommendations, governance, and investment priorities.",
      "Advise executives and the board on exposure, incidents, obligations, and choices.",
      "Build leadership depth and accountability across security and business teams.",
    ],
    successSignals: [
      "Material security decisions are timely, evidence-led, and owned at the right level.",
      "Strategy and investment produce measurable resilience instead of activity-only reporting.",
    ],
    recommendedCompetencyIds: [
      "risk-management",
      "governance-compliance-audit",
      "incident-response-forensics",
      "privacy-data-protection",
      "leadership-communication",
    ],
    prerequisites: [
      {
        kind: "role-experience",
        roleIds: [
          "information-security-manager",
          "cybersecurity-manager",
          "information-security-risk-manager",
          "principal-security-architect",
        ],
        description: "Senior accountability for security outcomes and cross-business decisions.",
        required: false,
      },
      {
        kind: "experience",
        description: "Executive communication, financial planning, crisis leadership, and talent development.",
        minimumYears: 8,
        required: false,
      },
    ],
    progression: {
      commonPriorRoleIds: [
        "information-security-manager",
        "cybersecurity-manager",
        "information-security-risk-manager",
        "principal-security-architect",
      ],
      nextRoleIds: [],
      lateralRoleIds: [],
    },
  },
  {
    id: "soc-analyst",
    title: "SOC Analyst",
    familyId: "security-operations",
    level: "entry",
    levelOrder: 1,
    summary:
      "Monitors security signals, validates alerts, gathers context, and escalates incidents with a clear evidence trail.",
    mission:
      "Turn uncertain alerts into timely, well-documented decisions without jumping to conclusions.",
    typicalResponsibilities: [
      "Triage alerts using playbooks, asset context, identity data, and telemetry.",
      "Build timelines and record facts, hypotheses, actions, and handoffs.",
      "Close benign cases responsibly or escalate with scope and severity rationale.",
    ],
    successSignals: [
      "Escalations contain enough evidence for responders to act immediately.",
      "Case records are reproducible and recurring noise leads to tuning work.",
    ],
    recommendedCompetencyIds: [
      "security-foundations",
      "network-cloud-security",
      "identity-access-management",
      "security-operations-detection",
      "leadership-communication",
    ],
    prerequisites: [
      {
        kind: "competency",
        competencyIds: ["security-foundations", "network-cloud-security"],
        description: "Comfort reading basic network, endpoint, identity, and cloud events.",
        required: true,
      },
      {
        kind: "portfolio",
        description: "A sample alert triage or investigation timeline from a safe lab.",
        required: false,
      },
    ],
    progression: {
      commonPriorRoleIds: [],
      nextRoleIds: ["threat-hunter", "incident-responder", "soc-manager"],
      lateralRoleIds: ["vulnerability-assessment-analyst", "grc-analyst"],
    },
  },
  {
    id: "threat-hunter",
    title: "Threat Hunter",
    familyId: "security-operations",
    level: "mid-career",
    levelOrder: 3,
    summary:
      "Proactively searches for malicious behavior that existing alerts may miss and turns discoveries into durable coverage.",
    mission:
      "Reduce uncertainty about hidden threats through bounded, evidence-driven hypotheses.",
    typicalResponsibilities: [
      "Prioritize hypotheses using environment context and relevant intelligence.",
      "Query and correlate endpoint, identity, network, and cloud telemetry.",
      "Document null results and convert useful patterns into detections or mitigations.",
    ],
    successSignals: [
      "Hunts have explicit data requirements, stopping rules, and confidence statements.",
      "Results improve detections, telemetry quality, or preventive controls.",
    ],
    recommendedCompetencyIds: [
      "network-cloud-security",
      "identity-access-management",
      "security-operations-detection",
      "threat-intelligence-hunting",
      "incident-response-forensics",
    ],
    prerequisites: [
      {
        kind: "role-experience",
        roleIds: ["soc-analyst", "incident-responder"],
        description: "Repeated investigations across more than one telemetry source.",
        required: false,
      },
      {
        kind: "portfolio",
        description: "A hunt plan that shows a hypothesis, query logic, findings, and coverage action.",
        required: false,
      },
    ],
    progression: {
      commonPriorRoleIds: ["soc-analyst", "incident-responder"],
      nextRoleIds: ["soc-manager", "principal-security-architect"],
      lateralRoleIds: ["digital-forensics-examiner", "cybersecurity-engineer"],
    },
  },
  {
    id: "soc-manager",
    title: "SOC Manager",
    familyId: "security-operations",
    level: "senior",
    levelOrder: 4,
    summary:
      "Leads people, process, technology, and service quality for security monitoring and detection operations.",
    mission:
      "Build a sustainable operation that detects meaningful threats and responds with speed, consistency, and care.",
    typicalResponsibilities: [
      "Set coverage priorities, escalation standards, staffing plans, and service measures.",
      "Coach analysts and coordinate engineering, intelligence, and response improvements.",
      "Manage major escalations, vendors, backlog, fatigue, and continuous improvement.",
    ],
    successSignals: [
      "Detection coverage and decision quality improve without hiding analyst workload.",
      "After-action items have owners and recurring operational problems decline.",
    ],
    recommendedCompetencyIds: [
      "security-operations-detection",
      "threat-intelligence-hunting",
      "incident-response-forensics",
      "risk-management",
      "leadership-communication",
    ],
    prerequisites: [
      {
        kind: "role-experience",
        roleIds: ["soc-analyst", "threat-hunter", "incident-responder"],
        description: "Investigation depth plus experience coaching or leading operational work.",
        required: false,
      },
      {
        kind: "portfolio",
        description: "A detection, quality, or workflow improvement backed by a before-and-after measure.",
        required: false,
      },
    ],
    progression: {
      commonPriorRoleIds: ["soc-analyst", "threat-hunter", "incident-responder"],
      nextRoleIds: ["cybersecurity-manager", "incident-commander", "ciso"],
      lateralRoleIds: ["information-security-manager"],
    },
  },
  {
    id: "incident-responder",
    title: "Incident Responder",
    familyId: "incident-response-forensics",
    level: "mid-career",
    levelOrder: 3,
    summary:
      "Investigates suspected incidents, defines scope, contains harm, and supports evidence-led recovery.",
    mission:
      "Protect the organization while preserving the information needed to understand and learn from the incident.",
    typicalResponsibilities: [
      "Validate incidents, establish scope, severity, objectives, and a decision log.",
      "Coordinate proportionate containment and collect relevant evidence.",
      "Support eradication, recovery validation, and post-incident improvement.",
    ],
    successSignals: [
      "Containment reduces harm without creating avoidable operational damage.",
      "Timelines and recovery criteria remain clear as facts change.",
    ],
    recommendedCompetencyIds: [
      "network-cloud-security",
      "identity-access-management",
      "security-operations-detection",
      "incident-response-forensics",
      "leadership-communication",
    ],
    prerequisites: [
      {
        kind: "role-experience",
        roleIds: ["soc-analyst", "vulnerability-assessment-analyst"],
        description: "Hands-on analysis of system and security telemetry.",
        required: false,
      },
      {
        kind: "portfolio",
        description: "An incident timeline and action plan from a safe simulation.",
        required: false,
      },
    ],
    progression: {
      commonPriorRoleIds: ["soc-analyst", "vulnerability-assessment-analyst"],
      nextRoleIds: ["digital-forensics-examiner", "incident-commander", "soc-manager"],
      lateralRoleIds: ["threat-hunter", "cybersecurity-engineer"],
    },
  },
  {
    id: "digital-forensics-examiner",
    title: "Digital Forensics Examiner",
    familyId: "incident-response-forensics",
    level: "mid-career",
    levelOrder: 3,
    summary:
      "Acquires and analyzes digital evidence using repeatable methods while protecting integrity, scope, and chain of custody.",
    mission:
      "Produce defensible findings that explain what the evidence supports, what it does not, and why.",
    typicalResponsibilities: [
      "Plan lawful, authorized collection and preserve evidence integrity.",
      "Analyze artifacts, correlate timelines, and test competing explanations.",
      "Write clear findings and explain limitations to technical and nontechnical audiences.",
    ],
    successSignals: [
      "Another qualified examiner can follow the method and reach the same result.",
      "Reports avoid claims beyond the evidence and protect sensitive data.",
    ],
    recommendedCompetencyIds: [
      "security-foundations",
      "network-cloud-security",
      "incident-response-forensics",
      "governance-compliance-audit",
      "leadership-communication",
    ],
    prerequisites: [
      {
        kind: "competency",
        competencyIds: ["incident-response-forensics"],
        description: "Evidence handling, artifact interpretation, timelines, and documentation discipline.",
        required: true,
      },
      {
        kind: "portfolio",
        description: "A sanitized examination report from a purpose-built practice image.",
        required: false,
      },
    ],
    progression: {
      commonPriorRoleIds: ["soc-analyst", "incident-responder"],
      nextRoleIds: ["incident-commander"],
      lateralRoleIds: ["threat-hunter", "it-auditor"],
    },
  },
  {
    id: "incident-commander",
    title: "Incident Commander",
    familyId: "incident-response-forensics",
    level: "senior",
    levelOrder: 4,
    summary:
      "Sets objectives and coordinates technical, business, legal, privacy, and communications work during major incidents.",
    mission:
      "Maintain a shared operating picture and drive safe, accountable decisions under pressure.",
    typicalResponsibilities: [
      "Establish command roles, cadence, priorities, decision rights, and a source of truth.",
      "Balance containment and recovery choices against operational and stakeholder impact.",
      "Deliver audience-appropriate updates and ensure a blameless improvement review.",
    ],
    successSignals: [
      "Teams act from shared facts, clear objectives, and recorded decisions.",
      "Recovery is verified and lessons become funded, owned actions.",
    ],
    recommendedCompetencyIds: [
      "incident-response-forensics",
      "risk-management",
      "privacy-data-protection",
      "leadership-communication",
    ],
    prerequisites: [
      {
        kind: "role-experience",
        roleIds: ["incident-responder", "soc-manager", "digital-forensics-examiner"],
        description: "Substantial incident participation plus facilitation and decision leadership.",
        required: false,
      },
      {
        kind: "portfolio",
        description: "A major-incident exercise plan, decision log, and after-action review.",
        required: false,
      },
    ],
    progression: {
      commonPriorRoleIds: ["incident-responder", "soc-manager", "digital-forensics-examiner"],
      nextRoleIds: ["cybersecurity-manager", "ciso"],
      lateralRoleIds: ["information-security-manager", "information-security-risk-manager"],
    },
  },
  {
    id: "cybersecurity-engineer",
    title: "Cybersecurity Engineer",
    familyId: "engineering-architecture",
    level: "mid-career",
    levelOrder: 3,
    summary:
      "Builds and automates security controls, integrations, and guardrails that teams can operate reliably.",
    mission:
      "Make secure behavior easier and control health visible across real systems.",
    typicalResponsibilities: [
      "Translate requirements and threat models into technical designs and backlog items.",
      "Implement, test, monitor, and maintain security tooling and platform guardrails.",
      "Partner with product, infrastructure, identity, cloud, and operations teams.",
    ],
    successSignals: [
      "Controls are testable, observable, maintainable, and adopted by their users.",
      "Automation reduces exposure and toil without creating opaque failure modes.",
    ],
    recommendedCompetencyIds: [
      "network-cloud-security",
      "identity-access-management",
      "secure-engineering-architecture",
      "vulnerability-assessment-testing",
      "leadership-communication",
    ],
    prerequisites: [
      {
        kind: "competency",
        competencyIds: ["network-cloud-security", "security-foundations"],
        description: "Systems fundamentals and the ability to script, configure, test, or automate safely.",
        required: true,
      },
      {
        kind: "portfolio",
        description: "A small control implementation with tests, monitoring, and a design note.",
        required: false,
      },
    ],
    progression: {
      commonPriorRoleIds: [
        "soc-analyst",
        "vulnerability-assessment-analyst",
        "junior-penetration-tester",
      ],
      nextRoleIds: ["principal-security-architect", "cybersecurity-manager"],
      lateralRoleIds: ["threat-hunter", "cybersecurity-consultant"],
    },
  },
  {
    id: "principal-security-architect",
    title: "Principal Security Architect",
    familyId: "engineering-architecture",
    level: "senior",
    levelOrder: 4,
    summary:
      "Guides high-impact architecture decisions and creates reusable security patterns across complex environments.",
    mission:
      "Shape systems so that risk is explicit, controls are coherent, and teams can deliver securely at scale.",
    typicalResponsibilities: [
      "Lead threat modeling and architecture reviews for critical initiatives.",
      "Define reference patterns, technical principles, exceptions, and validation strategies.",
      "Influence roadmaps and resolve trade-offs across engineering and business leaders.",
    ],
    successSignals: [
      "Teams reuse clear patterns and identify material design risks earlier.",
      "Architecture decisions record assumptions, alternatives, residual risk, and ownership.",
    ],
    recommendedCompetencyIds: [
      "network-cloud-security",
      "identity-access-management",
      "secure-engineering-architecture",
      "risk-management",
      "privacy-data-protection",
      "leadership-communication",
    ],
    prerequisites: [
      {
        kind: "role-experience",
        roleIds: ["cybersecurity-engineer", "threat-hunter", "cybersecurity-consultant"],
        description: "Deep technical delivery plus influence across multiple systems and teams.",
        required: false,
      },
      {
        kind: "portfolio",
        description: "A threat model and architecture decision record showing meaningful trade-offs.",
        required: false,
      },
    ],
    progression: {
      commonPriorRoleIds: ["cybersecurity-engineer", "threat-hunter", "cybersecurity-consultant"],
      nextRoleIds: ["cybersecurity-manager", "ciso"],
      lateralRoleIds: ["information-security-risk-manager", "incident-commander"],
    },
  },
  {
    id: "junior-penetration-tester",
    title: "Junior Penetration Tester",
    familyId: "offensive-vulnerability",
    level: "entry",
    levelOrder: 1,
    summary:
      "Performs supervised, authorized security testing and documents reproducible findings with remediation guidance.",
    mission:
      "Demonstrate realistic weakness safely, within scope, and in a form defenders can fix.",
    typicalResponsibilities: [
      "Confirm scope, authorization, test windows, exclusions, and stop conditions.",
      "Run controlled discovery and validation under senior oversight.",
      "Protect test data and write evidence-led findings with retest steps.",
    ],
    successSignals: [
      "Testing remains within authorization and avoids unnecessary disruption or data access.",
      "Findings are reproducible, contextual, and useful to the system owner.",
    ],
    recommendedCompetencyIds: [
      "security-foundations",
      "network-cloud-security",
      "identity-access-management",
      "vulnerability-assessment-testing",
      "leadership-communication",
    ],
    prerequisites: [
      {
        kind: "competency",
        competencyIds: ["security-foundations", "network-cloud-security"],
        description: "Systems, web, network, and identity basics plus explicit understanding of authorization.",
        required: true,
      },
      {
        kind: "portfolio",
        description: "A report from a legal training lab or intentionally vulnerable practice target.",
        required: false,
      },
    ],
    progression: {
      commonPriorRoleIds: [],
      nextRoleIds: ["vulnerability-assessment-analyst", "cybersecurity-engineer"],
      lateralRoleIds: ["soc-analyst", "cybersecurity-consultant"],
    },
  },
  {
    id: "vulnerability-assessment-analyst",
    title: "Vulnerability Assessment Analyst",
    familyId: "offensive-vulnerability",
    level: "early-career",
    levelOrder: 2,
    summary:
      "Discovers, validates, prioritizes, and tracks weaknesses across assets while helping owners remediate effectively.",
    mission:
      "Move vulnerability work from raw scanner output to verified, risk-based reduction of exposure.",
    typicalResponsibilities: [
      "Maintain authorized scope and run credentialed or contextual assessments.",
      "Validate findings, enrich them with asset and exposure context, and remove false positives.",
      "Partner on remediation, exceptions, retesting, metrics, and recurring root causes.",
    ],
    successSignals: [
      "Critical exposure falls and accepted exceptions are visible and reviewed.",
      "Reporting shows remediation outcomes, not just a count of scanner findings.",
    ],
    recommendedCompetencyIds: [
      "security-foundations",
      "network-cloud-security",
      "vulnerability-assessment-testing",
      "risk-management",
      "leadership-communication",
    ],
    prerequisites: [
      {
        kind: "competency",
        competencyIds: ["security-foundations", "vulnerability-assessment-testing"],
        description: "Asset, vulnerability, exposure, validation, and remediation fundamentals.",
        required: true,
      },
      {
        kind: "portfolio",
        description: "A risk-ranked assessment with validation notes and remediation follow-up.",
        required: false,
      },
    ],
    progression: {
      commonPriorRoleIds: ["junior-penetration-tester"],
      nextRoleIds: ["cybersecurity-engineer", "cybersecurity-consultant"],
      lateralRoleIds: ["soc-analyst", "grc-analyst", "information-security-risk-manager"],
    },
  },
  {
    id: "grc-analyst",
    title: "GRC Analyst",
    familyId: "governance-risk-privacy",
    level: "entry",
    levelOrder: 1,
    summary:
      "Maintains policies, control mappings, evidence, risks, exceptions, and remediation workflows for governance programs.",
    mission:
      "Make obligations and security commitments traceable to evidence, owners, and meaningful outcomes.",
    typicalResponsibilities: [
      "Map requirements to policies, controls, owners, and evidence sources.",
      "Coordinate assessments, exceptions, findings, and corrective actions.",
      "Prepare reporting that shows control health, risk, and overdue decisions.",
    ],
    successSignals: [
      "Evidence is current, relevant, and reusable rather than collected only before an audit.",
      "Gaps have clear owners, due dates, rationale, and escalation paths.",
    ],
    recommendedCompetencyIds: [
      "security-foundations",
      "governance-compliance-audit",
      "risk-management",
      "privacy-data-protection",
      "leadership-communication",
    ],
    prerequisites: [
      {
        kind: "competency",
        competencyIds: ["security-foundations", "governance-compliance-audit"],
        description: "Ability to read a requirement and connect it to a testable control objective.",
        required: true,
      },
      {
        kind: "portfolio",
        description: "A sample control matrix, evidence review, or risk register entry.",
        required: false,
      },
    ],
    progression: {
      commonPriorRoleIds: [],
      nextRoleIds: [
        "it-auditor",
        "privacy-analyst",
        "information-security-risk-manager",
        "information-security-manager",
      ],
      lateralRoleIds: ["soc-analyst", "vulnerability-assessment-analyst"],
    },
  },
  {
    id: "it-auditor",
    title: "IT Auditor",
    familyId: "governance-risk-privacy",
    level: "early-career",
    levelOrder: 2,
    summary:
      "Independently evaluates whether technology controls are suitably designed and operating as intended.",
    mission:
      "Provide fair, evidence-based assurance that helps accountable owners understand and address control risk.",
    typicalResponsibilities: [
      "Plan risk-based audits with objectives, criteria, scope, and sampling methods.",
      "Interview owners, inspect evidence, test controls, and document workpapers.",
      "Validate findings, agree actions, and follow remediation to closure.",
    ],
    successSignals: [
      "Conclusions trace to sufficient evidence and withstand independent review.",
      "Findings identify root causes and drive proportionate corrective action.",
    ],
    recommendedCompetencyIds: [
      "security-foundations",
      "identity-access-management",
      "governance-compliance-audit",
      "risk-management",
      "leadership-communication",
    ],
    prerequisites: [
      {
        kind: "competency",
        competencyIds: ["governance-compliance-audit", "risk-management"],
        description: "Control objectives, evidence quality, sampling, and objective documentation.",
        required: true,
      },
      {
        kind: "portfolio",
        description: "A control test workpaper and concise finding.",
        required: false,
      },
    ],
    progression: {
      commonPriorRoleIds: ["grc-analyst"],
      nextRoleIds: ["information-security-risk-manager", "information-security-manager"],
      lateralRoleIds: ["privacy-analyst", "cybersecurity-consultant"],
    },
  },
  {
    id: "privacy-analyst",
    title: "Privacy Analyst",
    familyId: "governance-risk-privacy",
    level: "early-career",
    levelOrder: 2,
    summary:
      "Maps personal-data use, assesses privacy impact, supports rights workflows, and advises teams on responsible data practices.",
    mission:
      "Help the organization use personal data transparently, proportionately, and with safeguards throughout its lifecycle.",
    typicalResponsibilities: [
      "Maintain records of processing and map data collection, sharing, retention, and deletion.",
      "Support privacy impact and third-party assessments with legal and security partners.",
      "Track risks, notices, consent or preference needs, rights requests, and remediation.",
    ],
    successSignals: [
      "Teams address privacy risk during design instead of after launch.",
      "Data inventories and assessments reflect actual practices and accountable owners.",
    ],
    recommendedCompetencyIds: [
      "security-foundations",
      "privacy-data-protection",
      "governance-compliance-audit",
      "risk-management",
      "leadership-communication",
    ],
    prerequisites: [
      {
        kind: "competency",
        competencyIds: ["privacy-data-protection", "risk-management"],
        description: "Data lifecycle, purpose, minimization, retention, risk, and escalation fundamentals.",
        required: true,
      },
      {
        kind: "portfolio",
        description: "A fictional data map and privacy impact assessment.",
        required: false,
      },
    ],
    progression: {
      commonPriorRoleIds: ["grc-analyst"],
      nextRoleIds: ["information-security-risk-manager", "information-security-manager"],
      lateralRoleIds: ["it-auditor", "cybersecurity-consultant"],
    },
  },
  {
    id: "information-security-risk-manager",
    title: "Information Security Risk Manager",
    familyId: "governance-risk-privacy",
    level: "senior",
    levelOrder: 4,
    summary:
      "Runs risk identification, analysis, treatment, acceptance, monitoring, and executive reporting across the organization.",
    mission:
      "Make uncertainty and security trade-offs visible so the right business owners can decide and remain accountable.",
    typicalResponsibilities: [
      "Facilitate risk assessments and maintain a decision-useful risk register.",
      "Challenge assumptions, compare treatment options, and guide risk acceptance.",
      "Aggregate themes and report exposure, dependencies, and treatment progress.",
    ],
    successSignals: [
      "Risk statements are specific enough to drive decisions and investment.",
      "Accepted risks have appropriate owners, rationale, expiry, and monitoring triggers.",
    ],
    recommendedCompetencyIds: [
      "security-foundations",
      "governance-compliance-audit",
      "risk-management",
      "privacy-data-protection",
      "leadership-communication",
    ],
    prerequisites: [
      {
        kind: "role-experience",
        roleIds: ["grc-analyst", "it-auditor", "privacy-analyst", "cybersecurity-consultant"],
        description: "Repeated assessment and facilitation of risk decisions across stakeholders.",
        required: false,
      },
      {
        kind: "portfolio",
        description: "A risk scenario, treatment options paper, and executive risk summary.",
        required: false,
      },
    ],
    progression: {
      commonPriorRoleIds: ["grc-analyst", "it-auditor", "privacy-analyst", "cybersecurity-consultant"],
      nextRoleIds: ["information-security-manager", "ciso"],
      lateralRoleIds: ["cybersecurity-manager", "principal-security-architect"],
    },
  },
];

export const starterModules: readonly LearningModule[] = [
  {
    id: "m01-orient",
    sequence: 1,
    title: "Orient: think like a security professional",
    summary:
      "Build a common language for systems, risk, ethics, authorization, and the many ways security roles collaborate.",
    estimatedMinutes: 75,
    competencyIds: ["security-foundations", "leadership-communication"],
    unlocksRoleIds: ["soc-analyst", "junior-penetration-tester", "grc-analyst"],
    lessons: [
      {
        id: "m01-orient-system-story",
        title: "Tell the story of a system",
        format: "explainer",
        estimatedMinutes: 20,
        summary: "Map assets, users, data flows, trust boundaries, dependencies, and business purpose.",
        objectives: [
          "Separate assets, actors, processes, and data.",
          "Identify where trust or responsibility changes.",
        ],
        activity: "Sketch the journey of a fictional customer login from device to cloud service and back.",
        completionEvidence: "A labeled system map with three assumptions and two open questions.",
      },
      {
        id: "m01-orient-risk-language",
        title: "From threat to business risk",
        format: "guided-practice",
        estimatedMinutes: 25,
        summary: "Connect threat events and control gaps to credible operational or human impact.",
        objectives: [
          "Distinguish threat, vulnerability, control, likelihood, and impact.",
          "Write a specific risk scenario without exaggerating certainty.",
        ],
        activity: "Rewrite vague cyber risks into cause-event-asset-impact statements.",
        completionEvidence: "One risk statement with assumptions and a possible treatment.",
      },
      {
        id: "m01-orient-career-map",
        title: "Choose a first destination, not a forever role",
        format: "career-planning",
        estimatedMinutes: 30,
        summary: "Compare the six career families by daily work, evidence of skill, and realistic transitions.",
        objectives: [
          "Select one primary and one adjacent career family.",
          "Translate existing experience into relevant security evidence.",
        ],
        activity: "Score role families by energy, current evidence, and next-learning effort.",
        completionEvidence: "A 30-day plan for one target role and one portfolio artifact.",
      },
    ],
  },
  {
    id: "m02-protect",
    sequence: 2,
    title: "Protect: understand the attack surface",
    summary:
      "Follow identity, endpoint, network, application, and cloud controls end to end, then test design assumptions safely.",
    estimatedMinutes: 90,
    competencyIds: [
      "network-cloud-security",
      "identity-access-management",
      "secure-engineering-architecture",
      "vulnerability-assessment-testing",
    ],
    unlocksRoleIds: [
      "vulnerability-assessment-analyst",
      "cybersecurity-engineer",
      "principal-security-architect",
    ],
    lessons: [
      {
        id: "m02-protect-access-journey",
        title: "Trace an access journey",
        format: "case-study",
        estimatedMinutes: 25,
        summary: "See how identity, device posture, network paths, sessions, and authorization work together.",
        objectives: [
          "Explain authentication versus authorization.",
          "Spot privilege, session, and trust-boundary risks.",
        ],
        activity: "Review a fictional contractor access flow and mark failure and telemetry points.",
        completionEvidence: "A control-and-telemetry overlay on the access flow.",
      },
      {
        id: "m02-protect-safe-assessment",
        title: "Plan an authorized assessment",
        format: "guided-practice",
        estimatedMinutes: 30,
        summary: "Define scope, approval, methods, data handling, communication, and stop conditions before testing.",
        objectives: [
          "Recognize that technical ability is not authorization.",
          "Create rules of engagement that protect people and services.",
        ],
        activity: "Draft test rules for a fictional staging environment with an unavailable payment dependency.",
        completionEvidence: "A signed-scope checklist and escalation path.",
      },
      {
        id: "m02-protect-design-tradeoffs",
        title: "Make a security architecture decision",
        format: "role-play",
        estimatedMinutes: 35,
        summary: "Compare design choices across security, usability, reliability, cost, and operations.",
        objectives: [
          "State assumptions and residual risk clearly.",
          "Recommend a control pattern with a validation plan.",
        ],
        activity: "Advise a product lead choosing between three privileged-access designs.",
        completionEvidence: "A concise architecture decision record.",
      },
    ],
  },
  {
    id: "m03-detect",
    sequence: 3,
    title: "Detect: turn signals into decisions",
    summary:
      "Work an alert from initial triage to documented closure, then use intelligence and hunting to improve coverage.",
    estimatedMinutes: 95,
    competencyIds: [
      "security-operations-detection",
      "threat-intelligence-hunting",
      "identity-access-management",
    ],
    unlocksRoleIds: ["soc-analyst", "threat-hunter", "soc-manager"],
    lessons: [
      {
        id: "m03-detect-triage",
        title: "Triage with confidence, not certainty",
        format: "guided-practice",
        estimatedMinutes: 30,
        summary: "Prioritize using signal quality, asset criticality, context, and potential impact.",
        objectives: [
          "Separate observed facts from hypotheses.",
          "Choose the next evidence that most reduces uncertainty.",
        ],
        activity: "Triage a fictional impossible-travel alert with incomplete identity context.",
        completionEvidence: "A case note with severity, confidence, next action, and rationale.",
      },
      {
        id: "m03-detect-timeline",
        title: "Build the investigation timeline",
        format: "case-study",
        estimatedMinutes: 30,
        summary: "Correlate timestamps and sources without forcing conflicting evidence into one story.",
        objectives: [
          "Normalize time and identify telemetry gaps.",
          "Record alternative explanations and disconfirming evidence.",
        ],
        activity: "Arrange identity, endpoint, and cloud events into a defensible timeline.",
        completionEvidence: "A timeline with source, confidence, and gap annotations.",
      },
      {
        id: "m03-detect-hunt-to-coverage",
        title: "From hunt hypothesis to coverage",
        format: "role-play",
        estimatedMinutes: 35,
        summary: "Design a bounded hunt and decide what a positive, negative, or inconclusive result changes.",
        objectives: [
          "Specify required data and a stopping rule.",
          "Turn findings into detection or collection improvements.",
        ],
        activity: "Pitch a hunt plan to a SOC manager balancing risk and analyst capacity.",
        completionEvidence: "A one-page hunt plan and coverage follow-up.",
      },
    ],
  },
  {
    id: "m04-respond",
    sequence: 4,
    title: "Respond: control the incident end to end",
    summary:
      "Practice command, containment, evidence, communications, recovery verification, and improvement as one coordinated system.",
    estimatedMinutes: 105,
    competencyIds: [
      "incident-response-forensics",
      "security-operations-detection",
      "leadership-communication",
    ],
    unlocksRoleIds: [
      "incident-responder",
      "digital-forensics-examiner",
      "incident-commander",
    ],
    lessons: [
      {
        id: "m04-respond-first-hour",
        title: "The first hour",
        format: "role-play",
        estimatedMinutes: 35,
        summary: "Establish objectives, roles, severity, cadence, evidence needs, and reversible containment.",
        objectives: [
          "Create a shared operating picture under uncertainty.",
          "Balance harm reduction with operational continuity.",
        ],
        activity: "Lead the opening stand-up for a fictional ransomware event.",
        completionEvidence: "An incident action plan and first executive update.",
      },
      {
        id: "m04-respond-evidence",
        title: "Preserve and interpret evidence",
        format: "guided-practice",
        estimatedMinutes: 30,
        summary: "Collect only what is authorized and relevant, preserve integrity, and report limitations.",
        objectives: [
          "Document chain of custody and collection context.",
          "Avoid conclusions beyond what artifacts support.",
        ],
        activity: "Prioritize evidence collection before a fictional system is rebuilt.",
        completionEvidence: "A collection log and evidence-led finding.",
      },
      {
        id: "m04-respond-recover-learn",
        title: "Recover, verify, learn",
        format: "case-study",
        estimatedMinutes: 40,
        summary: "Define safe restoration criteria and convert systemic lessons into accountable actions.",
        objectives: [
          "Set recovery validation and heightened-monitoring criteria.",
          "Run a blameless review focused on system improvement.",
        ],
        activity: "Decide whether a restored service is ready and facilitate the first five review questions.",
        completionEvidence: "A recovery checklist and action register with owners and dates.",
      },
    ],
  },
  {
    id: "m05-assess",
    sequence: 5,
    title: "Assess: prove, prioritize, and govern",
    summary:
      "Connect requirements, controls, evidence, vulnerability context, privacy impact, and risk decisions without turning compliance into a checkbox.",
    estimatedMinutes: 100,
    competencyIds: [
      "governance-compliance-audit",
      "risk-management",
      "privacy-data-protection",
      "vulnerability-assessment-testing",
    ],
    unlocksRoleIds: [
      "grc-analyst",
      "it-auditor",
      "privacy-analyst",
      "information-security-risk-manager",
      "cybersecurity-consultant",
    ],
    lessons: [
      {
        id: "m05-assess-control-evidence",
        title: "Test a control, not a screenshot",
        format: "guided-practice",
        estimatedMinutes: 30,
        summary: "Evaluate control design and operation using relevant, reliable, and sufficient evidence.",
        objectives: [
          "Write a clear control objective and test method.",
          "Recognize stale, incomplete, or self-asserted evidence.",
        ],
        activity: "Review fictional access-control evidence and request the smallest useful follow-up sample.",
        completionEvidence: "A workpaper with criteria, procedure, sample, result, and conclusion.",
      },
      {
        id: "m05-assess-prioritize",
        title: "Prioritize findings in context",
        format: "case-study",
        estimatedMinutes: 30,
        summary: "Combine severity with exposure, asset importance, compensating controls, and credible impact.",
        objectives: [
          "Avoid ranking by scanner score or framework label alone.",
          "Present treatment options and residual risk to the owner.",
        ],
        activity: "Rank five fictional findings and defend the top two to a system owner.",
        completionEvidence: "A prioritized action list with explicit rationale.",
      },
      {
        id: "m05-assess-privacy",
        title: "Follow personal data end to end",
        format: "role-play",
        estimatedMinutes: 40,
        summary: "Assess purpose, minimization, sharing, retention, rights, safeguards, and jurisdictional escalation.",
        objectives: [
          "Map personal data and identify affected people.",
          "Recommend product mitigations while routing legal conclusions to counsel.",
        ],
        activity: "Facilitate a privacy review for a fictional employee-wellness vendor.",
        completionEvidence: "A data map, risk list, mitigations, and open legal questions.",
      },
    ],
  },
  {
    id: "m06-lead",
    sequence: 6,
    title: "Lead: run the security system",
    summary:
      "Set outcomes, operating rhythms, measures, investment choices, crisis expectations, and board-level communication.",
    estimatedMinutes: 105,
    competencyIds: [
      "risk-management",
      "leadership-communication",
      "governance-compliance-audit",
      "secure-engineering-architecture",
    ],
    unlocksRoleIds: [
      "information-security-manager",
      "cybersecurity-manager",
      "soc-manager",
      "ciso",
    ],
    lessons: [
      {
        id: "m06-lead-operating-model",
        title: "Design the operating model",
        format: "case-study",
        estimatedMinutes: 35,
        summary: "Connect capabilities, decision rights, service expectations, people, partners, and governance.",
        objectives: [
          "Clarify who owns risk versus who advises or operates controls.",
          "Choose measures that show outcomes and operational health.",
        ],
        activity: "Redesign a fictional security program whose teams duplicate work and miss handoffs.",
        completionEvidence: "A capability map, decision-rights table, and three outcome measures.",
      },
      {
        id: "m06-lead-investment",
        title: "Make the investment case",
        format: "guided-practice",
        estimatedMinutes: 30,
        summary: "Compare initiatives by exposure reduction, resilience, dependencies, recurring cost, and execution risk.",
        objectives: [
          "Explain trade-offs without invented precision.",
          "State what happens if a proposal is delayed or declined.",
        ],
        activity: "Allocate a constrained fictional budget across identity, recovery, detection, and staffing options.",
        completionEvidence: "A ranked investment memo with assumptions and residual risk.",
      },
      {
        id: "m06-lead-board-brief",
        title: "Brief the board",
        format: "role-play",
        estimatedMinutes: 40,
        summary: "Communicate exposure, trajectory, decisions, and assurance without drowning the audience in technical detail.",
        objectives: [
          "Lead with business relevance and a clear ask.",
          "Answer challenge questions honestly and succinctly.",
        ],
        activity: "Deliver a three-minute fictional risk briefing and respond to board questions.",
        completionEvidence: "A one-page briefing with status, evidence, choices, recommendation, and ask.",
      },
    ],
  },
];
