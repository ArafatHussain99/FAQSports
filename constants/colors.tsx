// FAQ Sports colour tokens: "The Fixture Sheet".
// Bright office paper, black print, one highlighter that marks only what is
// live or current, and drawing-pin colours that decode teams, sports and state.
// Keep every value a 6-digit hex (except liveGlow): screens tint with
// `${Colors.x}20`, which only works on 6-digit hex.
export default {
  // Paper and surfaces
  background: '#F7F6F1', // the sheet
  surface: '#FBFAF7', // bars, sheets, modals
  surfaceLight: '#EFEDE6', // inputs, secondary blocks, pressed rows
  card: '#FFFFFF', // a block printed on the sheet
  cardHover: '#EFEDE6',

  // Ink
  text: '#16181D',
  textSecondary: '#4E525B',
  textMuted: '#6B6F78', // 4.6:1 on paper; still not for essential text
  textInverse: '#FFFFFF', // text on primary / live / ink fills

  // Rules
  border: '#D6D4CC', // the one hairline rule
  borderLight: '#E6E4DD',
  ink: '#16181D', // strong rules, selected underline

  // Actions
  primary: '#1F5FD1', // ink blue: primary actions, links, active tab
  primaryDark: '#174AA6',
  onPrimary: '#FFFFFF',
  secondary: '#16181D',
  accent: '#B4540A',

  // Signature: the highlighter. Only behind what is live or current.
  highlight: '#E8F24A',
  highlightSoft: '#F4F8B8',
  onHighlight: '#16181D',

  // Match state
  live: '#D7263D',
  liveGlow: 'rgba(215, 38, 61, 0.25)',
  upcoming: '#9A6410',
  completed: '#2F7D4F',
  cancelled: '#6B6F78',

  // Feedback
  success: '#2F7D4F',
  warning: '#9A6410',
  error: '#D7263D',
  info: '#1F5FD1',

  // Sport pins
  cricket: '#2F7D4F',
  football: '#1F5FD1',
  tableTennis: '#D7263D',
  badminton: '#7A4FB5',
  carrom: '#B4540A',
  uno: '#0E8C7F',

  // Role tags (ink text sits on these)
  adminBadge: '#E8F24A',
  playerBadge: '#D5E2FA',

  // Scrim behind sheets and the loading overlay
  scrim: 'rgba(22, 24, 29, 0.35)',
};
