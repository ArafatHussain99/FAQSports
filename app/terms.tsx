import React from 'react';
import { Linking, ScrollView, StyleSheet, Text } from 'react-native';
import Colors from '@/constants/colors';
import { Space, Type } from '@/constants/tokens';
import { SUPPORT_EMAIL, supportMailto } from '@/constants/support';

// Plain-language terms for an internal staff app. Review with whoever owns
// company policy before relying on them; update LAST_UPDATED when they change.
const LAST_UPDATED = '23 November 2026';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: '1. Who can use FAQ Sports',
    body: 'FAQ Sports is an internal app for FAQ employees. You must sign in with your own company account and keep your password to yourself. Access can be removed at any time, for example when you leave the company.',
  },
  {
    title: '2. Acceptable use',
    body: 'Use the app for organising and following office sport. Don’t enter false results, impersonate someone else, try to get admin access you weren’t given, or try to access data you aren’t meant to see. Comments and names you add should follow the company’s code of conduct.',
  },
  {
    title: '3. Admins',
    body: 'Admins can create matches and tournaments, enter results, manage teams, players and stadiums, and set champions. Admins should keep results accurate and fair, and correct mistakes promptly.',
  },
  {
    title: '4. Your information',
    body: 'The app stores your email address, your role, and sport information such as your name, teams, match statistics and awards. This information is visible to other signed-in employees in the app. It is used only to run office sport and is not sold or shared outside the company.',
  },
  {
    title: '5. Results and statistics',
    body: 'Scores, tables, leaderboards and champions are kept as accurately as we can but are for fun. Some features are still being built; for example, cricket live scoring isn’t saved yet. Disputes about a result are settled by the admins.',
  },
  {
    title: '6. Availability',
    body: 'The app is provided as is. It may be unavailable at times, change, or lose data. We aren’t liable for any loss that comes from using it.',
  },
  {
    title: '7. Changes to these terms',
    body: 'We may update these terms. The date at the top shows when they last changed. Continuing to use the app means you accept the current terms.',
  },
];

export default function TermsScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.updated}>Last updated {LAST_UPDATED}</Text>
      {SECTIONS.map(section => (
        <React.Fragment key={section.title}>
          <Text style={styles.heading} accessibilityRole="header">{section.title}</Text>
          <Text style={styles.body}>{section.body}</Text>
        </React.Fragment>
      ))}
      <Text style={styles.heading} accessibilityRole="header">8. Contact</Text>
      <Text style={styles.body}>
        Questions about these terms:{' '}
        <Text style={styles.link} onPress={() => Linking.openURL(supportMailto('FAQ Sports terms'))} accessibilityRole="link">
          {SUPPORT_EMAIL}
        </Text>
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: Space.xl,
    paddingTop: Space.lg,
    paddingBottom: 100,
  },
  updated: {
    ...Type.footnote,
    color: Colors.textMuted,
  },
  heading: {
    ...Type.headline,
    color: Colors.text,
    marginTop: Space.xl,
    marginBottom: Space.xs,
  },
  body: {
    ...Type.body,
    color: Colors.textSecondary,
  },
  link: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
