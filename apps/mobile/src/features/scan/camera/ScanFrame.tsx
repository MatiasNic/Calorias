import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components';
import { fontFamily, overlay, spacing } from '@/theme';

/** Viewfinder corners plus the framing guide under them. */
export function ScanFrame({ guide, barcode }: { guide: string; barcode: boolean }) {
  return (
    <View style={styles.center} pointerEvents="none">
      <View style={[styles.frame, barcode && styles.frameBarcode]}>
        <View style={[styles.corner, styles.tl]} />
        <View style={[styles.corner, styles.tr]} />
        <View style={[styles.corner, styles.bl]} />
        <View style={[styles.corner, styles.br]} />
      </View>
      <AppText align="center" style={[styles.white, styles.hint]}>
        {guide}
      </AppText>
    </View>
  );
}

const CORNER = 40;
const styles = StyleSheet.create({
  white: { color: overlay.text },
  center: { alignItems: 'center', gap: spacing.lg },
  frame: { width: 300, height: 300 },
  frameBarcode: { height: 170 },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: overlay.text },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 22 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 22 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 22 },
  br: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 22,
  },
  hint: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    paddingHorizontal: spacing.md,
  },
});
