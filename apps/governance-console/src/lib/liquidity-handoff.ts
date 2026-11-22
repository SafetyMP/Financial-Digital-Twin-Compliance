export type ReviewAction = 'request' | 'document' | 'escalate';
export type SourcePeriod = 'matched' | 'prior';

export const schedules = {
  prior: {
    date: '13 November',
    feedback: 'The outflow schedule predates the 14 November asset balance by one day.',
  },
  matched: {
    date: '14 November',
    feedback: 'Both records are as of 14 November. Their dates support a like-for-like comparison.',
  },
} satisfies Record<SourcePeriod, { date: string; feedback: string }>;

export function liquidityHandoff(action: ReviewAction, period: SourcePeriod, belowLine: boolean) {
  const mismatched = period === 'prior';

  if (action === 'request') {
    return {
      owner: 'Treasury analyst',
      task: mismatched ? 'Replace the prior-day outflow schedule' : 'Substantiate the outflow estimate',
      next: mismatched
        ? 'Attach an outflow schedule as of 14 November covering the next 30 days. Independent risk will recalculate coverage.'
        : 'The dates agree. Supply the cash-flow breakdown and explain the largest assumption so independent risk can reproduce the estimate.',
    };
  }

  if (action === 'document') {
    if (mismatched) {
      return {
        owner: 'Independent liquidity risk',
        task: 'Record an unresolved date exception',
        next: 'Keep the ratio provisional. Ask Treasury for matched records before using it in the morning briefing.',
      };
    }
    return belowLine ? {
      owner: 'Treasury funding lead',
      task: 'Add a response to the documented shortfall',
      next: 'Independent risk has recorded the calculation. Treasury still owes an explanation for the gap and a named owner for follow-up.',
    } : {
      owner: 'Independent liquidity risk',
      task: 'Retain the boundary-case review',
      next: 'File the matched inputs and challenge note together. Reopen if the outflow estimate changes or a later source disagrees.',
    };
  }

  if (mismatched) {
    return {
      owner: 'Liquidity risk lead',
      task: 'Review the evidence exception',
      next: 'Brief the lead on the conflicting dates. Treasury must supply a comparable schedule before the lead can assess a funding gap.',
    };
  }
  return belowLine ? {
    owner: 'Treasury funding lead',
    task: 'Assess the supported shortfall',
    next: 'Take the matched schedule and the reviewer’s challenge to the funding meeting. Record the funding lead’s assessment and next review time.',
  } : {
    owner: 'Liquidity risk lead',
    task: 'Examine the reason for escalation',
    next: 'Coverage reaches the monitoring line. Identify any separate concern and supporting evidence before sending a funding referral.',
  };
}
