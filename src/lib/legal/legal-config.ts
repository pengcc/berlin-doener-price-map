type LegalEnvironment = Record<string, string | undefined> & {
  DOENER_LEGAL_CONTACT_EMAIL?: string;
  DOENER_LEGAL_OPERATOR_ADDRESS?: string;
  DOENER_LEGAL_OPERATOR_NAME?: string;
};

export type LegalConfig = {
  contactEmail?: string;
  operatorAddress?: string;
  operatorName?: string;
};

function optionalValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function getLegalConfig(
  env: LegalEnvironment = process.env,
): LegalConfig {
  return {
    contactEmail: optionalValue(env.DOENER_LEGAL_CONTACT_EMAIL),
    operatorAddress: optionalValue(env.DOENER_LEGAL_OPERATOR_ADDRESS),
    operatorName: optionalValue(env.DOENER_LEGAL_OPERATOR_NAME),
  };
}
