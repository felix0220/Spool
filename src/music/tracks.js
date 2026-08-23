const defineTrack = (track) => Object.freeze({
  ...track,
  labelLines: Object.freeze([...track.labelLines]),
});

export const TRACK_LIBRARY = Object.freeze([
  defineTrack({
    id: 'chill-lofi-inspired-loop',
    cassetteId: 'ember',
    slot: 1,
    title: 'Chill Lofi Inspired',
    labelLines: ['CHILL LOFI', 'INSPIRED'],
    audioUrl: '/audio/chill-lofi-inspired-loop.ogg',
    durationHint: 97.216054,
    sourceUrl: 'https://opengameart.org/content/chill-lofi-inspired-loop-edit',
    license: 'CC0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    attribution: 'qubodup (loop edit) / omfgdude (source)',
    sha256: 'ccaa02bb60310146f1fa3b1c70be0a5a57f0674b9c4944a22b85b0c03e932cdb',
    artVariant: 'bloom-signal',
    accent: 'orange',
  }),
  defineTrack({
    id: 'night-soul',
    cassetteId: 'blue',
    slot: 2,
    title: 'Night Soul',
    labelLines: ['NIGHT', 'SOUL'],
    audioUrl: '/audio/night-soul.mp3',
    durationHint: 197.694675,
    sourceUrl: 'https://freemusicarchive.org/music/Ketsa/jazz-hop-1/night-soul/',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    attribution: 'Ketsa',
    sha256: 'd2aae5a4534ff92521e0eccc71d26d3c1d050ad4caa5163101a273db8dd8ee19',
    artVariant: 'night-grid',
    accent: 'blue',
  }),
  defineTrack({
    id: 'cathedral-dust',
    cassetteId: 'cream',
    slot: 3,
    title: 'Cathedral Dust',
    labelLines: ['CATHEDRAL', 'DUST'],
    audioUrl: '/audio/cathedral-dust.mp3',
    durationHint: 162.864,
    sourceUrl: 'https://pixabay.com/music/beats-pusha-t-type-beat-cathedral-dust-480878/',
    license: 'Pixabay Content License',
    licenseUrl: 'https://pixabay.com/service/license-summary/',
    attribution: null,
    sha256: '4c2d3050993cf88640fce348640b5811e0691eb718c0815ccd41372def4733e5',
    artVariant: 'cathedral-ribs',
    accent: 'ochre',
  }),
]);

const TRACK_BY_ID = new Map(TRACK_LIBRARY.map((track) => [track.id, track]));
const TRACK_BY_CASSETTE_ID = new Map(TRACK_LIBRARY.map((track) => [track.cassetteId, track]));

function requireTrack(index, key, keyName) {
  const track = index.get(key);
  if (!track) throw new RangeError('Unknown ' + keyName + ': ' + String(key));
  return track;
}

export function getTrackById(trackId) {
  return requireTrack(TRACK_BY_ID, trackId, 'track ID');
}

export function getTrackByCassetteId(cassetteId) {
  return requireTrack(TRACK_BY_CASSETTE_ID, cassetteId, 'cassette ID');
}

// Credits are derived from the canonical library so provenance cannot drift
// away from the track that is actually loaded.
export const TRACK_CREDITS = Object.freeze(TRACK_LIBRARY.map((track) => Object.freeze({
  id: track.id,
  cassetteId: track.cassetteId,
  title: track.title,
  audioUrl: track.audioUrl,
  sourceUrl: track.sourceUrl,
  license: track.license,
  licenseUrl: track.licenseUrl,
  attribution: track.attribution,
  sha256: track.sha256,
})));
