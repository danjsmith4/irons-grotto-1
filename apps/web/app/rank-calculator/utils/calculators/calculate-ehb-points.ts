import Decimal from 'decimal.js-light';


/*
0-500 is 1.5x
501-1500 is 1.25x
1500-2500 is 1x
2500+ is .75
*/
export function calculateEhbPoints(ehb: number) {
  const firstBracket = new Decimal(Math.min(ehb, 500)).times(1.5);
  const secondBracket = new Decimal(Math.min(Math.max(ehb - 500, 0), 1000)).times(1.25);
  const thirdBracket = new Decimal(Math.min(Math.max(ehb - 1500, 0), 1000)).times(1);
  const fourthBracket = new Decimal(Math.max(ehb - 2500, 0)).times(0.75);

  const scaledPoints = firstBracket
    .plus(secondBracket)
    .plus(thirdBracket)
    .plus(fourthBracket)
    .toDecimalPlaces(0, Decimal.ROUND_FLOOR)
    .toNumber();

  return scaledPoints;
}
