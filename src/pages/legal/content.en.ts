import type { LegalDocuments } from "./contentTypes";

export const legalDocumentsEn: LegalDocuments = {
  terms: {
    title: "Terms of Use",
    summary:
      "Draft terms governing access to PAJES and its use for EXCI-MAA's authorised professional activities.",
    version: "Draft 0.1",
    effectiveDate: null,
    lastUpdated: null,
    sections: [
      {
        id: "objet",
        title: "1. Purpose and scope",
        paragraphs: [
          "This document sets out proposed rules for accessing and using PAJES for professional activities authorised by EXCI-MAA. It is intended for people who have been granted access.",
          "EXCI-MAA and its advisers must review and approve it. Applicable internal policies, contracts and laws take precedence where they impose a different requirement.",
        ],
      },
      {
        id: "identite",
        title: "2. EXCI-MAA and PAJES",
        paragraphs: [
          "The application identifies the organisation as EXCI-MAA and presents PAJES as a platform for managing the organisation's professional activities. The full legal name, official contact details and identity of the responsible entity must be confirmed before publication.",
          "PAJES brings together business management and operational tracking features. Availability and modules may depend on the organisation's configuration.",
        ],
      },
      {
        id: "eligibilite",
        title: "3. Eligibility and authorised access",
        paragraphs: [
          "Access is limited to people authorised by EXCI-MAA for a professional need. Users must follow internal access procedures and use only the features for which they are authorised.",
          "Creating an account does not automatically grant access to every module or record.",
        ],
      },
      {
        id: "compte",
        title: "4. Account creation and authentication",
        paragraphs: [
          "Creating an account requires the information requested in the registration flow. PAJES authentication uses Supabase. Credentials are personal and must not be shared.",
          "Users must provide accurate information and report changes through the appropriate internal channel. EXCI-MAA must confirm its account verification and activation process.",
        ],
      },
      {
        id: "responsabilites",
        title: "5. User responsibilities and credential confidentiality",
        paragraphs: [
          "Users must protect their password and authentication methods, secure their devices and sign out when PAJES is no longer in use on a shared device.",
          "Any suspected loss, disclosure or unauthorised use of credentials must be reported promptly under the internal security procedure.",
        ],
      },
      {
        id: "permissions",
        title: "6. Roles, permissions and authorised use",
        paragraphs: [
          "PAJES's interface provides roles and permissions that govern access to modules and actions. Assigned rights should correspond to the account holder's professional responsibilities.",
          "Effective access to records also depends on the active server-side service rules. EXCI-MAA must verify those rules and their consistency before publishing these terms; this draft does not certify their configuration.",
        ],
      },
      {
        id: "confidentialite",
        title: "7. Confidentiality of information",
        paragraphs: [
          "Information about the organisation, its clients, staff, suppliers and partners that a user accesses in their role must be treated as confidential, subject to applicable legal and contractual requirements.",
          "Users may access, use or disclose this information only for an authorised business need and must follow internal confidentiality and retention policies.",
        ],
      },
      {
        id: "exactitude",
        title: "8. Accuracy and integrity of information",
        paragraphs: [
          "Users must enter accurate, relevant and current information, correct errors under applicable procedures, and must not falsify, delete or alter data or activity records without authorisation.",
          "PAJES does not replace professional review, supporting evidence, accounting checks or approvals required by the organisation's procedures.",
        ],
      },
      {
        id: "modules",
        title: "9. Modules and records",
        paragraphs: [
          "Depending on assigned permissions and active configuration, PAJES may provide management of clients, engagements, working papers, review notes, findings, staff, leave, expense reports, invoices, cash, stock, fixed assets, suppliers, resources and reports.",
          "The presence of a module or record does not give a user permission to access or approve it. Users may only use features enabled and authorised for their account.",
        ],
      },
      {
        id: "workflows",
        title: "10. Submission, modification and approval",
        paragraphs: [
          "Requests and records follow the steps and responsibilities configured for the relevant module and internal procedures. Entering or submitting information, or seeing a displayed status, does not by itself constitute approval unless the applicable process explicitly says otherwise.",
          "EXCI-MAA process owners must confirm the approval steps, authorised approvers and meaning of each status.",
        ],
      },
      {
        id: "interdictions",
        title: "11. Prohibited activities",
        paragraphs: [
          "Users must not use PAJES beyond their assigned permissions, attempt to gain additional privileges, access records without an authorised purpose, or extract, copy or disclose data without authorisation.",
          "Users must also not bypass controls, introduce malicious code, disrupt the service, test its vulnerabilities without written permission or use PAJES for unlawful purposes.",
        ],
      },
      {
        id: "incident",
        title: "12. Reporting security incidents",
        paragraphs: [
          "Any lost device, unusual activity, access error, possible disclosure or suspected unauthorised access must be reported promptly to EXCI-MAA's designated IT contact or security channel.",
          "Do not investigate or delete information in a way that may destroy useful evidence. EXCI-MAA must confirm its internal reporting contacts and timelines.",
        ],
      },
      {
        id: "propriete",
        title: "13. Intellectual property and permitted use",
        paragraphs: [
          "Rights in PAJES, its components, content and identifying marks belong to their respective rights holders or are used with permission, in accordance with applicable law.",
          "Users receive only a limited right to use the application for authorised professional activities. Rights ownership and component licences must be verified before publication.",
        ],
      },
      {
        id: "disponibilite",
        title: "14. Availability, maintenance and technical limits",
        paragraphs: [
          "Access may be interrupted or limited for maintenance, updates, incidents, technical constraints or dependencies on third-party services. This draft makes no promise of uninterrupted availability.",
          "Users must follow EXCI-MAA's backup and continuity procedures and must not treat PAJES as the sole copy of a document or record that requires separate preservation.",
        ],
      },
      {
        id: "suspension",
        title: "15. Suspension, access revocation and termination",
        paragraphs: [
          "Subject to internal procedures and applicable law, EXCI-MAA may review, suspend or revoke access when a professional need ends, a risk is identified or a rule is breached.",
          "Closing an account does not by itself determine what happens to associated professional records; their retention, archiving or deletion is governed by applicable rules and responsible process owners.",
        ],
      },
      {
        id: "modifications",
        title: "16. Changes to these terms",
        paragraphs: [
          "Each applicable version should identify its version number, effective date and how material changes will be notified. Users should be informed using a process approved by EXCI-MAA.",
          "The notification process and consequences of changes for users must be decided before publication.",
        ],
      },
      {
        id: "droit",
        title: "17. Governing law and disputes",
        paragraphs: [
          "The governing law, dispute resolution process and any competent jurisdiction have not been determined in this draft. EXCI-MAA's advisers must confirm them in light of the contracting entity and applicable laws.",
          "This working version specifies no jurisdiction and creates no liability exclusion.",
        ],
      },
      {
        id: "contact-date",
        title: "18. Contact and effective date",
        paragraphs: [
          "For questions about these terms, use the official channel designated by EXCI-MAA. The full legal name, publication contact, effective date and final version remain to be confirmed.",
          "This is an unapproved draft and has no stated effective date.",
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    summary:
      "Draft describing data categories used in PAJES and information EXCI-MAA must confirm before publication.",
    version: "Draft 0.1",
    effectiveDate: null,
    lastUpdated: null,
    sections: [
      {
        id: "responsable",
        title: "1. Responsible organisation and contact",
        paragraphs: [
          "The application identifies EXCI-MAA as the organisation behind PAJES. The full legal identity of the entity that determines the purposes and means of processing, its address and its dedicated privacy contact must be confirmed before publication.",
          "This draft does not designate a specific contact person or supervisory authority.",
        ],
      },
      {
        id: "perimetre",
        title: "2. Scope",
        paragraphs: [
          "This proposed policy covers personal data processed through PAJES features used by EXCI-MAA, including account management and enabled business modules.",
          "It does not describe external processing or third-party services that have not been verified in the deployment.",
        ],
      },
      {
        id: "categories",
        title: "3. Categories of data",
        paragraphs: [
          "The application screens and data structures reviewed indicate that the following categories may be processed when entered and when relevant modules are used:",
        ],
        bullets: [
          "Account and professional profile information, including name, email address, role and profile details.",
          "Contact details and business information relating to clients and suppliers.",
          "Information in engagements, records, working papers, review notes, findings, leave requests and expense reports.",
          "Billing and operational management information, as well as information users enter in the relevant modules.",
          "Authentication data and technical metadata required by the services in use, subject to their actual configuration.",
        ],
      },
      {
        id: "compte-profil",
        title: "4. Account and professional profile",
        paragraphs: [
          "Registration requests an email address, password and name. The associated profile may include first and last names, full name, role and other professional fields depending on the features used.",
          "Account information is used to authenticate users and provide enabled application features.",
        ],
      },
      {
        id: "clients-entreprise",
        title: "5. Clients and business records",
        paragraphs: [
          "Client, engagement and working-paper modules may contain business contact details and information relating to clients' or partners' activities. Content depends on what users are authorised to enter.",
          "Users should limit entries to information relevant to authorised work and follow applicable confidentiality commitments.",
        ],
      },
      {
        id: "donnees-operationnelles",
        title: "6. Operational records",
        paragraphs: [
          "Features identified in the application include engagements, records and working papers, review notes, findings, leave, expense reports, invoices, cash, stock, fixed assets, suppliers, staff and reports. Personal data that may appear in these records is processed for the corresponding operational purposes.",
          "Exact data categories and approval workflows must be confirmed with the owners of each module.",
        ],
      },
      {
        id: "technique",
        title: "7. Technical data, logs and diagnostics",
        paragraphs: [
          "The reviewed application code confirms the use of Supabase for authentication and data access. Authentication and hosting services may process technical identifiers and service metadata depending on the deployment configuration.",
          "The actual collection of access logs, security events, IP addresses and diagnostics has not been established by reviewing the interface alone. EXCI-MAA must verify production settings and providers before describing its scope.",
        ],
      },
      {
        id: "finalites",
        title: "8. Processing purposes",
        paragraphs: [
          "Subject to confirmation, the data described above is used to manage accounts and permissions, provide business-management features, track tasks and requests, produce operational records and maintain the service.",
          "EXCI-MAA must confirm purposes for each module and any additional use. This draft does not assert advertising or profiling purposes.",
        ],
      },
      {
        id: "base-legale",
        title: "9. Legal bases",
        paragraphs: [
          "The legal basis for each purpose depends on the relevant relationship and applicable law. It may require an assessment of legal obligations, contractual relationships, legitimate interests or consent where consent is actually required.",
          "No legal basis is assigned here. EXCI-MAA's advisers must complete and approve that assessment before publication.",
        ],
      },
      {
        id: "minimisation",
        title: "10. Data minimisation and accuracy",
        paragraphs: [
          "Requested and entered data should be relevant and limited to the professional need concerned. Users should keep information accurate and report necessary corrections under organisational procedures.",
          "Validation and update rules must be confirmed for each data category.",
        ],
      },
      {
        id: "acces-interne",
        title: "11. Internal access and permissions",
        paragraphs: [
          "The application includes roles and interface controls intended to differentiate available actions by profile. Appropriate access should be limited to authorised people with a business need.",
          "Active server-side policies also determine effective access to records. Their production configuration must be verified; this draft does not guarantee that permissions currently restrict every record.",
        ],
      },
      {
        id: "prestataires",
        title: "12. Service providers and processors",
        paragraphs: [
          "The application code uses Supabase for authentication and data access. Contracting entities, processing roles, subprocessors and features actually deployed must be confirmed against production contracts and configuration.",
          "No other email, analytics or file-storage provider is named here without verification of its actual role.",
        ],
      },
      {
        id: "hebergement-transferts",
        title: "13. Hosting and international transfers",
        paragraphs: [
          "Hosting regions, processing locations and any international transfers cannot be determined from the reviewed source code alone. They must be verified in the Supabase project, provider contracts and deployment configuration.",
          "EXCI-MAA and its advisers must identify and describe safeguards for any applicable transfers. No exclusive hosting location is asserted.",
        ],
      },
      {
        id: "conservation",
        title: "14. Retention periods and criteria",
        paragraphs: [
          "No approved retention periods were found in the materials reviewed. EXCI-MAA must set periods or criteria by category and purpose, taking applicable accounting, contractual, professional and legal obligations into account.",
          "Professional files or legally required records may need to be retained after an account is closed where applicable law or rules require it.",
        ],
      },
      {
        id: "archivage-suppression",
        title: "15. Archiving, deletion and account closure",
        paragraphs: [
          "Closing an account does not necessarily result in immediate deletion of data in business records. Archiving, deletion, backup and deletion-request procedures must be confirmed with the relevant owners and providers.",
          "Retention exceptions must rely on an applicable basis and be clearly communicated to affected people.",
        ],
      },
      {
        id: "securite",
        title: "16. Security",
        paragraphs: [
          "EXCI-MAA should implement technical and organisational measures appropriate to the risks, manage access and handle incidents under its procedures. Users contribute by protecting credentials and reporting concerns.",
          "Specific measures and their scope must be verified by responsible personnel. This draft makes no claim of absolute security or certification.",
        ],
      },
      {
        id: "droits",
        title: "17. Individuals' rights",
        paragraphs: [
          "Depending on applicable law and circumstances, people may have rights concerning their data, such as access, rectification, erasure, restriction, objection, portability or withdrawal of consent where processing relies on consent. These rights may have conditions or exceptions.",
          "The final list of rights, exceptions and competent authority must be confirmed by EXCI-MAA's advisers for the relevant jurisdictions.",
        ],
      },
      {
        id: "demandes",
        title: "18. Making a privacy request",
        paragraphs: [
          "Requests should be sent to EXCI-MAA's official privacy contact, which remains to be confirmed. A person may be asked for information needed to verify their identity and clarify the request, without excessive data collection.",
          "Handling procedures, response deadlines and available remedies must be approved under applicable law.",
        ],
      },
      {
        id: "cookies",
        title: "19. Cookies and similar technologies",
        paragraphs: [
          "The application uses browser local storage to retain preferences such as language and theme, and authentication may use session mechanisms provided by its service provider.",
          "The presence of cookies, analytics tools or other trackers in the production deployment has not been established. Their inventory, purposes and user choices must be verified before publication.",
        ],
      },
      {
        id: "mineurs",
        title: "20. Children's data",
        paragraphs: [
          "PAJES is presented as a professional tool for EXCI-MAA-authorised users, not as a service directed to children. Any children's data included in professional records requires a context-specific assessment under applicable law.",
        ],
      },
      {
        id: "mises-a-jour",
        title: "21. Policy updates",
        paragraphs: [
          "Each published version should specify its version, effective and update dates, and explain how material changes will be communicated to users and affected people.",
          "EXCI-MAA must confirm its notification process and approval of future updates.",
        ],
      },
      {
        id: "contact-date",
        title: "22. Contact, version and dates",
        paragraphs: [
          "For privacy questions or personal-data requests, contact EXCI-MAA through its official channel. The dedicated contact, full legal identity and publication details must be confirmed.",
          "Working draft 0.1. No effective or last-updated date is published until the content has been approved.",
        ],
      },
    ],
  },
};
