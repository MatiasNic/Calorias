export type ScanMode = 'photo' | 'barcode' | 'label' | 'text';
export const SCAN_MODES = ['photo', 'barcode', 'label', 'text'] as const;
export const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e'] as const;
export const QUICK_HINTS = ['noOil', 'homemade', 'small', 'shared'] as const;

/** What the camera screen is waiting on, if anything. */
export type ScanBusy = null | 'barcode' | 'label' | 'capture' | 'gallery';
