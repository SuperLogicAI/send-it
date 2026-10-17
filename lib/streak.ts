import { shiftDay } from "./rules.ts";

// Daily streak, weekly goal and banked skips, replayed from the days an owner
// confirmed a send. Nothing is stored, so it cannot drift out of sync.
//   - A workday (Mon-Fri) with at least one confirmed send extends the streak.
//   - Weekends neither extend nor break it, but their sends count to the week.
//   - Reaching WEEK_GOAL sends in a Mon-Sun week banks one skip (up to BANK_CAP,
//     a full work week). A missed workday spends a skip instead of breaking.
export const WEEK_GOAL = 5;
export const BANK_CAP = 5;

export type Streak = {
  streak: number;
  best: number;
  bank: number;
  weekCount: number;
  weeksHit: number;
  todayDone: boolean;
  workdayToday: boolean;
};

const weekday = (day: string) => new Date(`${day}T12:00:00.000Z`).getUTCDay();
export const isWorkday = (day: string) => {
  const d = weekday(day);
  return d >= 1 && d <= 5;
};
const weekStart = (day: string) => shiftDay(day, -((weekday(day) + 6) % 7));

// sentDays: the owner-local day of every confirmed send (repeats allowed).
export function replayStreak(sentDays: string[], today: string): Streak {
  const counts = new Map<string, number>();
  for (const d of sentDays) counts.set(d, (counts.get(d) ?? 0) + 1);
  let streak = 0,
    best = 0,
    bank = 0,
    weeksHit = 0,
    week = "",
    weekCount = 0,
    credited = false;
  const first = sentDays.filter((d) => d <= today).sort()[0];
  for (let d = first; first && d <= today; d = shiftDay(d, 1)) {
    if (weekStart(d) !== week) {
      week = weekStart(d);
      weekCount = 0;
      credited = false;
    }
    const sent = counts.get(d) ?? 0;
    weekCount += sent;
    if (weekCount >= WEEK_GOAL && !credited) {
      credited = true;
      weeksHit++;
      bank = Math.min(BANK_CAP, bank + 1);
    }
    if (!isWorkday(d)) continue;
    if (sent > 0) best = Math.max(best, ++streak);
    else if (d < today) {
      // Today is still open, so only past days can be missed.
      if (bank > 0) bank--;
      else streak = 0;
    }
  }
  if (week !== weekStart(today)) weekCount = 0;
  return {
    streak,
    best,
    bank,
    weekCount,
    weeksHit,
    todayDone: (counts.get(today) ?? 0) > 0,
    workdayToday: isWorkday(today),
  };
}

export const BADGES = [
  { id: "first_send", label: "First follow-up", hint: "Confirm your first send" },
  { id: "streak_5", label: "5-day streak", hint: "Follow up on 5 workdays in a row" },
  { id: "weeks_4", label: "4 strong weeks", hint: "Reach your weekly goal 4 times" },
  { id: "first_reply", label: "First reply", hint: "Log a reply or a booked call" },
] as const;

export function badges(s: Streak, totalSends: number, replies: number) {
  const earned = {
    first_send: totalSends > 0,
    streak_5: s.best >= 5,
    weeks_4: s.weeksHit >= 4,
    first_reply: replies > 0,
  };
  return BADGES.map((b) => ({ ...b, earned: earned[b.id] }));
}
