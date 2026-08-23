export const DECK_PHASE = Object.freeze({
  STANDBY: 'standby',
  DRAGGING: 'dragging',
  LOADING: 'loading',
  ENGAGED: 'engaged',
  EJECTING: 'ejecting',
});

export const PHASE_STATUS = Object.freeze({
  [DECK_PHASE.STANDBY]: 'Ready. Choose a cassette.',
  [DECK_PHASE.DRAGGING]: 'Cassette selected. Release over the bay to load it.',
  [DECK_PHASE.LOADING]: 'Loading cassette.',
  [DECK_PHASE.ENGAGED]: 'Cassette loaded. Player ready.',
  [DECK_PHASE.EJECTING]: 'Ejecting cassette.',
});
