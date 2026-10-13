import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Card, TextField, toast } from '@/components';
import type { MealDraft } from '@/features/diary/draftStore';
import { reportAiMistake } from '@/services/ai';
import { spacing } from '@/theme';

/** "Report a mistake" link that opens a short form sent as AI feedback. */
export function ReportMistake({ draft }: { draft: MealDraft }) {
  const { t } = useTranslation();
  const [reporting, setReporting] = useState(false);
  const [report, setReport] = useState('');

  const sendReport = async () => {
    await reportAiMistake(draft.aiScanId, draft.original, draft.items, report).catch(
      () => undefined,
    );
    setReporting(false);
    setReport('');
    toast.success(t('review.reportSent'));
  };

  if (!reporting) {
    return (
      <Button
        label={t('review.report')}
        variant="ghost"
        size="sm"
        icon="flag"
        onPress={() => setReporting(true)}
      />
    );
  }
  return (
    <Card style={styles.card}>
      <TextField
        label={t('review.reportTitle')}
        placeholder={t('review.reportPlaceholder')}
        value={report}
        onChangeText={setReport}
        multiline
        maxLength={1000}
      />
      <Button label={t('common.save')} size="md" onPress={sendReport} disabled={!report.trim()} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
});
