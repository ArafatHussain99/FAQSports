import React, { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Hairline, Radius, Space, Touch, Type } from '@/constants/tokens';
import { SUPPORT_EMAIL, supportMailto } from '@/constants/support';

const QUESTIONS: { q: string; a: string }[] = [
  {
    q: 'What is FAQ Sports?',
    a: 'An internal app for FAQ employees to follow and run office sport: cricket, football and table tennis matches, teams, players, tournaments and champions.',
  },
  {
    q: 'How do I sign in?',
    a: 'Use your company email address and password. If you can’t sign in, use Contact Support and we’ll help.',
  },
  {
    q: 'What can an admin do that a player can’t?',
    a: 'Admins create and score matches, create tournaments and enter their results, manage teams, players and stadiums, and set champions. Players can view everything.',
  },
  {
    q: 'How do I become an admin?',
    a: 'Admin access is given by the app owner. Ask through Contact Support.',
  },
  {
    q: 'How does a tournament work?',
    a: 'Every team plays every other team once in a league. Depending on the setup, the top 2 then play a final, or the top 4 play semi-finals (1st v 4th, 2nd v 3rd) and a final. Ongoing tournaments show at the top of Home for their sport; finished ones are under More → Tournaments → Archived.',
  },
  {
    q: 'How is the tournament table sorted?',
    a: 'By points first. Cricket: win 2, tie or no result 1, then net run rate, then head-to-head. Football: win 3, draw 1, then goal difference, then head-to-head, then goals scored. Table tennis: win 3, then head-to-head, then game difference. If teams are still level where it decides who goes through, an admin chooses.',
  },
  {
    q: 'How is net run rate worked out?',
    a: 'Runs scored per over faced, minus runs conceded per over bowled, over all league matches. A team that is bowled out counts as having faced its full overs. Abandoned (no result) matches don’t count.',
  },
  {
    q: 'Can a player be in a cricket team and a football team?',
    a: 'Yes. Each player can be in one cricket team and one football team at the same time. Table tennis teams are picked per tournament from the players list.',
  },
  {
    q: 'What are the Leaderboards?',
    a: 'Top performers for one calendar year in each sport, from recorded match stats. Use the arrows to see earlier years.',
  },
  {
    q: 'Why is a cricket match missing after I closed the app?',
    a: 'Cricket live scoring is currently kept on the device only and isn’t saved yet. Table tennis matches and tournaments are saved.',
  },
];

export default function FaqScreen() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.group}>
        {QUESTIONS.map((item, i) => {
          const expanded = open === i;
          return (
            <View key={item.q} style={i > 0 && styles.ruled}>
              <TouchableOpacity
                style={styles.question}
                onPress={() => setOpen(expanded ? null : i)}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
              >
                <Text style={styles.questionText}>{item.q}</Text>
                {expanded ? (
                  <ChevronUp size={20} color={Colors.textMuted} />
                ) : (
                  <ChevronDown size={20} color={Colors.textMuted} />
                )}
              </TouchableOpacity>
              {expanded && <Text style={styles.answer}>{item.a}</Text>}
            </View>
          );
        })}
      </View>

      <Text style={styles.more}>Still stuck?</Text>
      <TouchableOpacity
        style={styles.contactBtn}
        onPress={() => Linking.openURL(supportMailto())}
        accessibilityRole="button"
        accessibilityHint={`Opens an email to ${SUPPORT_EMAIL}`}
      >
        <Text style={styles.contactBtnText}>Contact Support</Text>
      </TouchableOpacity>
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
  group: {
    backgroundColor: Colors.card,
    borderWidth: Hairline,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  ruled: {
    borderTopWidth: Hairline,
    borderTopColor: Colors.border,
  },
  question: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    minHeight: Touch,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
  },
  questionText: {
    ...Type.bodyStrong,
    flex: 1,
    color: Colors.text,
  },
  answer: {
    ...Type.body,
    color: Colors.textSecondary,
    paddingHorizontal: Space.lg,
    paddingBottom: Space.lg,
  },
  more: {
    ...Type.headline,
    color: Colors.text,
    marginTop: Space.xxl,
  },
  contactBtn: {
    minHeight: Touch,
    marginTop: Space.sm,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  contactBtnText: {
    ...Type.headline,
    color: Colors.onPrimary,
  },
});
