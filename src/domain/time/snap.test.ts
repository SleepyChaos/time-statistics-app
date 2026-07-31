import {
  FIVE_MINUTES_MS,
  snapBackwardToFiveMinutes,
  snapForwardToFiveMinutes,
  snapInDragDirection,
} from './snap';

describe('five minute snapping', () => {
  const fourteenForty = 14 * 60 * 60 * 1000 + 40 * 60 * 1000;
  const fourteenFortyFour = fourteenForty + 4 * 60 * 1000;

  it('snaps 14:44 later to 14:45', () => {
    expect(snapForwardToFiveMinutes(fourteenFortyFour)).toBe(
      fourteenForty + FIVE_MINUTES_MS,
    );
  });

  it('snaps 14:44 earlier to 14:40', () => {
    expect(snapBackwardToFiveMinutes(fourteenFortyFour)).toBe(fourteenForty);
  });

  it('keeps an existing grid point unchanged', () => {
    expect(snapInDragDirection(fourteenForty, 'later')).toBe(fourteenForty);
    expect(snapInDragDirection(fourteenForty, 'earlier')).toBe(fourteenForty);
  });
});
