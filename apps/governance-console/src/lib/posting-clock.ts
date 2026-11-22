// Signed minutes between two HH:MM readings on the same business day.
export function minutesBetween(from: string, to: string) {
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  return minutes(to) - minutes(from);
}
