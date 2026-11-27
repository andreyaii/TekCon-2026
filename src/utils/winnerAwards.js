function normalizeGroupCode(value) {
  return String(value || '').trim().replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function getPodiumPlace(winner) {
  const title = String(winner.awardTitle || '').toLowerCase();
  const order = Number(winner.displayOrder);
  if (order === 1 || order === 2 || order === 3) return order;
  if (/2nd runner[- ]?up/i.test(title)) return 3;
  if (/1st runner[- ]?up/i.test(title)) return 2;
  if (/1st|first|champion|gold|grand champion/i.test(title)) return 1;
  if (/2nd|second|silver/i.test(title)) return 2;
  if (/3rd|third|bronze/i.test(title)) return 3;
  return null;
}

export function groupWinnersByGroup(winners, { deduplicate = false, isPitchPerfect = false } = {}) {
  const winnersByGroup = new Map();

  winners.forEach((winner, index) => {
    const groupCode = normalizeGroupCode(winner.groupCode);
    const groupKey = deduplicate && groupCode
      ? `group:${groupCode}`
      : deduplicate && winner.winnerId
        ? `winner:${winner.winnerId}`
        : `record:${index}`;
    if (!winnersByGroup.has(groupKey)) {
      winnersByGroup.set(groupKey, []);
    }
    winnersByGroup.get(groupKey).push(winner);
  });

  return Array.from(winnersByGroup.values(), (groupWinners) => {
    const sortedWinners = [...groupWinners].sort(
      (a, b) => (Number(a.displayOrder) || 999) - (Number(b.displayOrder) || 999),
    );
    const podiumWinner = isPitchPerfect
      ? sortedWinners.find((winner) => getPodiumPlace(winner) === 1)
        || sortedWinners.find((winner) => getPodiumPlace(winner) === 2)
        || sortedWinners.find((winner) => getPodiumPlace(winner) === 3)
      : null;
    const primaryWinner = podiumWinner || sortedWinners[0];

    return {
      ...primaryWinner,
      awardTitles: Array.from(new Set(groupWinners.map((winner) => String(winner.awardTitle || '').trim()).filter(Boolean))),
      awardCategories: Array.from(new Set(groupWinners.map((winner) => String(winner.awardCategory || '').trim()).filter(Boolean))),
      podiumPlace: podiumWinner ? getPodiumPlace(podiumWinner) : null,
    };
  });
}
