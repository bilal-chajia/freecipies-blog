export const getCircularSupportPosition = (
  cardIndex: number,
  selectedIndex: number,
  itemCount: number,
): 1 | 2 | null => {
  if (itemCount < 2) return null;

  const offset = ((cardIndex - selectedIndex) % itemCount + itemCount) % itemCount;
  return offset === 1 || offset === 2 ? offset : null;
};
