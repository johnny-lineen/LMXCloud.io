export const LEGAL_EFFECTIVE_DATE = "July 8, 2026";
export const SUPPORT_EMAIL = "support@lmxcloud.io";

export type LegalDocId = "terms" | "privacy" | "acceptable-use" | "contact";

export const LEGAL_DOCS: {
  id: LegalDocId;
  title: string;
  description: string;
}[] = [
  {
    id: "terms",
    title: "Terms of Service",
    description: "Beta terms for using LMX Cloud.",
  },
  {
    id: "privacy",
    title: "Privacy Policy",
    description: "What we collect and how we use it.",
  },
  {
    id: "acceptable-use",
    title: "Acceptable Use",
    description: "Rules for lawful, fair API use.",
  },
  {
    id: "contact",
    title: "Contact & support",
    description: "Feedback, abuse reports, and privacy requests.",
  },
];
