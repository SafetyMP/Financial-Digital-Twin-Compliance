export const SITE_NAME = 'Financial Digital Twin';
export const SITE_TITLE = 'Financial Digital Twin | Financial Governance Workspace';
export const DEMO_URL = 'https://safetymp.github.io/Financial-Digital-Twin-Compliance/';
export const REPOSITORY_URL = 'https://github.com/SafetyMP/Financial-Digital-Twin-Compliance';
export const SITE_DESCRIPTION = 'A synthetic governance workspace for financial institutions. Prioritize issues, inspect evidence, and record reviews in an interactive browser demo.';

export const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      '@id': `${DEMO_URL}#demo`,
      name: `${SITE_NAME} — Governance workspace demo`,
      url: DEMO_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web browser',
      isAccessibleForFree: true,
      inLanguage: 'en',
      featureList: [
        'Synthetic financial issue review queue',
        'Illustrative evidence and issue context',
        'Browser-local acknowledgements, escalations, and review history',
        'Illustrative scenario sensitivity calculations',
      ],
      isBasedOn: { '@id': `${REPOSITORY_URL}#source` },
    },
    {
      '@type': 'SoftwareSourceCode',
      '@id': `${REPOSITORY_URL}#source`,
      name: SITE_NAME,
      codeRepository: REPOSITORY_URL,
      url: REPOSITORY_URL,
      description: 'Open-source financial governance workspace with a synthetic demo and a separate development integration for alert review and audit evidence.',
      license: `${REPOSITORY_URL}/blob/main/LICENSE`,
      targetProduct: { '@id': `${DEMO_URL}#demo` },
    },
  ],
};
