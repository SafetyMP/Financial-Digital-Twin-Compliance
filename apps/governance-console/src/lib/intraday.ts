export const times = ['09:00', '09:10', '09:20', '09:30', '09:45', '10:00', '10:05', '10:15'] as const;
export const openingCash = 50;
export type Plan = { delayed: boolean; holdBatch: boolean; line: 0 | 20 | 40 };

export const orders = [
  { id: 'margin', name: 'Clearing margin', amount: 40, due: 3, source: 'Clearinghouse call MC-17' },
  { id: 'securities', name: 'Securities settlement', amount: 25, due: 4, source: 'Custodian instruction DV-08' },
  { id: 'batch', name: 'Customer batch', amount: 30, due: 5, source: 'Payments file CB-21' },
] as const;
type OrderId = typeof orders[number]['id'];

export type Frame = {
  time: string;
  cash: number;
  headroom: number;
  peakDraw: number;
  observations: string[];
  settledAt: Partial<Record<OrderId, number>>;
  released: OrderId[];
  missed: number;
};

export function replay(plan: Plan): Frame[] {
  const settledAt: Partial<Record<OrderId, number>> = {};
  const released: OrderId[] = [];
  let cash = openingCash;
  let peakDraw = 0;
  return times.map((time, tick) => {
    const observations: string[] = [];
    if (tick === 0) observations.push('Opening statement OS-01 confirms $50m cash.');
    if (tick === 2 && plan.delayed) observations.push('Receipt RC-35 has missed its expected posting time.');
    if (tick === (plan.delayed ? 6 : 2)) {
      cash += 35;
      observations.push('Correspondent advice RC-35 posts +$35m.');
    }
    if (tick === 7) {
      cash += 30;
      observations.push('Closing receipt RC-30 posts +$30m.');
    }
    for (const order of orders) {
      const releaseTick = order.id === 'batch' && !plan.holdBatch ? 1 : order.due;
      if (tick === releaseTick) {
        released.push(order.id);
        observations.push(order.source + ' releases for settlement.');
      }
      if (!released.includes(order.id) || settledAt[order.id] !== undefined) continue;
      if (cash + plan.line >= order.amount) {
        cash -= order.amount;
        settledAt[order.id] = tick;
        observations.push(order.name + ' settles −$' + order.amount + 'm.');
      } else if (tick === order.due) {
        observations.push(order.name + ' is still unfunded at cutoff.');
      }
    }
    peakDraw = Math.max(peakDraw, -cash);
    return {
      time, cash, peakDraw, headroom: cash + plan.line, observations,
      released: [...released], settledAt: { ...settledAt },
      missed: orders.filter(o => tick >= o.due && (settledAt[o.id] ?? Infinity) > o.due).length,
    };
  });
}

export function minutesLate(index: number, due: number) {
  const inMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  return Math.max(0, inMinutes(times[index]) - inMinutes(times[due]));
}
