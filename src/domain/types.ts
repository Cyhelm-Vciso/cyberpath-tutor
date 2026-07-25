export type CareerFamilyId =
  | "leadership-strategy"
  | "security-operations"
  | "incident-response-forensics"
  | "engineering-architecture"
  | "offensive-vulnerability"
  | "governance-risk-privacy";

export type RoleId =
  | "ciso"
  | "information-security-manager"
  | "cybersecurity-manager"
  | "cybersecurity-consultant"
  | "soc-analyst"
  | "threat-hunter"
  | "soc-manager"
  | "incident-responder"
  | "digital-forensics-examiner"
  | "incident-commander"
  | "cybersecurity-engineer"
  | "principal-security-architect"
  | "junior-penetration-tester"
  | "vulnerability-assessment-analyst"
  | "it-auditor"
  | "grc-analyst"
  | "information-security-risk-manager"
  | "privacy-analyst";

export type CompetencyId =
  | "security-foundations"
  | "network-cloud-security"
  | "identity-access-management"
  | "security-operations-detection"
  | "threat-intelligence-hunting"
  | "incident-response-forensics"
  | "vulnerability-assessment-testing"
  | "secure-engineering-architecture"
  | "governance-compliance-audit"
  | "risk-management"
  | "privacy-data-protection"
  | "leadership-communication";

export type ExperienceLevel =
  | "entry"
  | "early-career"
  | "mid-career"
  | "senior"
  | "executive";

export type RolePrerequisite =
  | {
      kind: "competency";
      competencyIds: readonly CompetencyId[];
      description: string;
      required: boolean;
    }
  | {
      kind: "role-experience";
      roleIds: readonly RoleId[];
      description: string;
      required: boolean;
    }
  | {
      kind: "experience";
      description: string;
      minimumYears?: number;
      required: boolean;
    }
  | {
      kind: "portfolio";
      description: string;
      required: boolean;
    };

export interface RoleProgression {
  readonly commonPriorRoleIds: readonly RoleId[];
  readonly nextRoleIds: readonly RoleId[];
  readonly lateralRoleIds: readonly RoleId[];
}

export interface CareerRole {
  readonly id: RoleId;
  readonly title: string;
  readonly familyId: CareerFamilyId;
  readonly level: ExperienceLevel;
  readonly levelOrder: 1 | 2 | 3 | 4 | 5;
  readonly summary: string;
  readonly mission: string;
  readonly typicalResponsibilities: readonly string[];
  readonly successSignals: readonly string[];
  readonly recommendedCompetencyIds: readonly CompetencyId[];
  readonly prerequisites: readonly RolePrerequisite[];
  readonly progression: RoleProgression;
}

export interface CareerFamily {
  readonly id: CareerFamilyId;
  readonly title: string;
  readonly shortTitle: string;
  readonly description: string;
  readonly outcome: string;
  readonly icon: string;
  readonly accentColor: `#${string}`;
  readonly roleIds: readonly RoleId[];
}

export interface CoreCompetency {
  readonly id: CompetencyId;
  readonly title: string;
  readonly description: string;
  readonly outcomes: readonly string[];
  readonly evidenceOfSkill: readonly string[];
  readonly familyIds: readonly CareerFamilyId[];
}

export type ModuleId =
  | "m01-orient"
  | "m02-protect"
  | "m03-detect"
  | "m04-respond"
  | "m05-assess"
  | "m06-lead";

export type LessonId = `${ModuleId}-${string}`;

export type LessonFormat =
  | "explainer"
  | "case-study"
  | "guided-practice"
  | "role-play"
  | "knowledge-check"
  | "career-planning";

export interface Lesson {
  readonly id: LessonId;
  readonly title: string;
  readonly format: LessonFormat;
  readonly estimatedMinutes: number;
  readonly summary: string;
  readonly objectives: readonly string[];
  readonly activity: string;
  readonly completionEvidence: string;
}

export interface LearningModule {
  readonly id: ModuleId;
  readonly sequence: 1 | 2 | 3 | 4 | 5 | 6;
  readonly title: string;
  readonly summary: string;
  readonly estimatedMinutes: number;
  readonly competencyIds: readonly CompetencyId[];
  readonly unlocksRoleIds: readonly RoleId[];
  readonly lessons: readonly Lesson[];
}

export type ScenarioId =
  | "impossible-travel"
  | "ransomware-standup"
  | "harborview-assessment"
  | "audit-evidence-gap"
  | "privacy-vendor-review"
  | "board-risk-briefing";

export type ScenarioDifficulty = "foundation" | "intermediate" | "advanced";

export type ScenarioPhase =
  | "brief"
  | "assess"
  | "contain"
  | "investigate"
  | "communicate"
  | "recover"
  | "improve";

export type EvidenceKind =
  | "alert"
  | "log"
  | "email"
  | "timeline"
  | "policy"
  | "interview-note"
  | "risk-register"
  | "architecture-note"
  | "forensic-note"
  | "executive-brief";

export interface ScenarioActor {
  readonly id: string;
  readonly name: string;
  readonly title: string;
  readonly publicPosition: string;
  readonly concern: string;
}

export interface ScenarioEvidence {
  readonly id: string;
  readonly title: string;
  readonly kind: EvidenceKind;
  readonly content: string;
  readonly significance: string;
  readonly initiallyVisible: boolean;
}

export type DecisionQuality = "strong" | "partial" | "unsafe";

export interface ScenarioDecisionOption {
  readonly id: string;
  readonly label: string;
  readonly quality: DecisionQuality;
  readonly coachFeedback: string;
  readonly consequences: readonly string[];
}

export interface ScenarioDecisionPoint {
  readonly id: string;
  readonly phase: ScenarioPhase;
  readonly title: string;
  readonly context: string;
  readonly prompt: string;
  readonly evidenceIds: readonly string[];
  readonly options: readonly ScenarioDecisionOption[];
  readonly recommendedOptionId: string;
}

export interface RolePlayScenario {
  readonly id: ScenarioId;
  readonly title: string;
  readonly subtitle: string;
  readonly summary: string;
  readonly difficulty: ScenarioDifficulty;
  readonly estimatedMinutes: number;
  readonly familyIds: readonly CareerFamilyId[];
  readonly primaryRoleId: RoleId;
  readonly supportingRoleIds: readonly RoleId[];
  readonly competencyIds: readonly CompetencyId[];
  readonly setting: string;
  readonly learnerBrief: string;
  readonly objectives: readonly string[];
  readonly actors: readonly ScenarioActor[];
  readonly evidence: readonly ScenarioEvidence[];
  readonly decisionPoints: readonly ScenarioDecisionPoint[];
  readonly idealResponseSteps: readonly string[];
  readonly scoreDimensions: readonly {
    readonly competencyId: CompetencyId;
    readonly label: string;
    readonly description: string;
  }[];
  readonly debriefQuestions: readonly string[];
  readonly safetyNote: string;
}
