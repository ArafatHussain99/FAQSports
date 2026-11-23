import Colors from '@/constants/colors';
import { Hairline, Radius, Space, Touch, Type } from '@/constants/tokens';
import { Check, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  visible: boolean;
  /** Teams level on every tie-breaker. */
  options: { id: string; name: string; detail?: string }[];
  /** How many of them go through. */
  slots: number;
  title: string;
  message: string;
  saving: boolean;
  error: string | null;
  onConfirm: (chosenIds: string[]) => void;
  onClose: () => void;
};

/** Pop-up asking an admin who goes through when the tie-breakers can't decide. */
export default function TieBreakModal({ visible, options, slots, title, message, saving, error, onConfirm, onClose }: Props) {
  const [chosen, setChosen] = useState<string[]>([]);

  useEffect(() => {
    if (visible) setChosen([]);
  }, [visible]);

  const toggle = (id: string) =>
    setChosen(prev => (prev.includes(id) ? prev.filter(c => c !== id) : prev.length < slots ? [...prev, id] : prev));

  const ready = chosen.length === slots && !saving;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
              <X size={22} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.message}>{message}</Text>
          <ScrollView style={styles.list}>
            {options.map((o, i) => {
              const selected = chosen.includes(o.id);
              const disabled = !selected && chosen.length >= slots;
              return (
                <TouchableOpacity
                  key={o.id}
                  style={[styles.option, i > 0 && styles.optionRuled, selected && styles.optionSelected, disabled && styles.disabled]}
                  onPress={() => toggle(o.id)}
                  disabled={disabled}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected, disabled }}
                >
                  <View style={styles.optionText}>
                    <Text style={styles.optionLabel} numberOfLines={1}>{o.name}</Text>
                    {o.detail ? <Text style={styles.optionDetail}>{o.detail}</Text> : null}
                  </View>
                  {selected && <Check size={20} color={Colors.onHighlight} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {error && <Text style={styles.error}>{error}</Text>}
          <TouchableOpacity
            style={[styles.primaryBtn, !ready && styles.disabled]}
            onPress={() => onConfirm(chosen)}
            disabled={!ready}
            accessibilityRole="button"
          >
            <Text style={styles.primaryBtnText}>
              {saving ? 'Saving...' : `Confirm (${chosen.length}/${slots})`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'center',
    padding: Space.xl,
    backgroundColor: Colors.scrim,
  },
  sheet: {
    maxHeight: '90%',
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    padding: Space.lg,
    borderRadius: Radius.lg,
    borderWidth: Hairline,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...Type.headline,
    color: Colors.text,
    flex: 1,
  },
  closeBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: -Space.sm,
  },
  message: {
    ...Type.subhead,
    color: Colors.textSecondary,
    marginBottom: Space.md,
  },
  list: {
    flexGrow: 0,
    borderWidth: Hairline,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.card,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    minHeight: Touch,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
  },
  optionRuled: {
    borderTopWidth: Hairline,
    borderTopColor: Colors.border,
  },
  optionSelected: {
    backgroundColor: Colors.highlight,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    ...Type.bodyStrong,
    color: Colors.text,
  },
  optionDetail: {
    ...Type.footnote,
    color: Colors.textSecondary,
  },
  error: {
    ...Type.subhead,
    color: Colors.error,
    marginTop: Space.md,
  },
  primaryBtn: {
    minHeight: Touch,
    marginTop: Space.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  primaryBtnText: {
    ...Type.headline,
    color: Colors.onPrimary,
  },
  disabled: {
    opacity: 0.4,
  },
});
