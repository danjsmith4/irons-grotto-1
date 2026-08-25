export function calculateEhpPoints(ehp: number, scaling: number) {
  const pointsPerEhp = 1;
  const pointsAwarded = Math.floor(
    Number((ehp * pointsPerEhp * scaling).toFixed(3)),
  );

  return pointsAwarded;
}
