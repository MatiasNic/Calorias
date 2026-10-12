import createIconSet from '@expo/vector-icons/createIconSet';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import { useTheme, type ThemeColors } from '@/theme';
import glyphMap from './materialSymbols.json';

/**
 * Icons are Material Symbols Rounded (weight 400), as in the design handoff
 * (design/handoff-v0.3). The font is a subset with only the glyphs the app uses
 * (assets/fonts/MaterialSymbolsRounded.ttf, map in materialSymbols.json).
 *
 * Screens may pass a Material Symbol name ("photo_camera") or a legacy Ionicons name
 * ("camera-outline"): legacy names are translated below, so older code keeps working.
 * Anything without a symbol (brand logos) falls back to Ionicons.
 */
export const MATERIAL_SYMBOLS_FONT = 'MaterialSymbolsRounded';
export const MATERIAL_SYMBOLS_ASSET = require('../../assets/fonts/MaterialSymbolsRounded.ttf');
const Symbols = createIconSet(glyphMap, MATERIAL_SYMBOLS_FONT, MATERIAL_SYMBOLS_ASSET);

export type SymbolName = keyof typeof glyphMap;
type IonName = ComponentProps<typeof Ionicons>['name'];
export type IconName = SymbolName | IonName;

const FROM_IONICONS: Partial<Record<IonName, SymbolName>> = {
  add: 'add',
  'add-circle': 'add_circle',
  'add-circle-outline': 'add_circle',
  'alert-circle': 'error',
  analytics: 'monitoring',
  'arrow-back': 'arrow_back',
  'arrow-undo': 'undo',
  'arrow-up': 'arrow_upward',
  barbell: 'fitness_center',
  'barbell-outline': 'fitness_center',
  barcode: 'barcode_scanner',
  'barcode-outline': 'barcode_scanner',
  bicycle: 'directions_bike',
  book: 'menu_book',
  'book-outline': 'menu_book',
  bulb: 'lightbulb',
  'cafe-outline': 'local_cafe',
  calendar: 'calendar_month',
  'calendar-outline': 'calendar_month',
  camera: 'photo_camera',
  'camera-outline': 'photo_camera',
  'chatbubble-ellipses-outline': 'chat_bubble',
  chatbubbles: 'forum',
  'chatbubbles-outline': 'forum',
  checkmark: 'check',
  'checkmark-circle': 'check_circle',
  'checkmark-circle-outline': 'check_circle',
  'chevron-back': 'chevron_left',
  'chevron-down': 'expand_more',
  'chevron-forward': 'chevron_right',
  'chevron-up': 'expand_less',
  close: 'close',
  'close-circle-outline': 'cancel',
  'cloud-offline': 'cloud_off',
  'cloud-offline-outline': 'cloud_off',
  copy: 'content_copy',
  create: 'edit',
  'create-outline': 'edit',
  'desktop-outline': 'desktop_windows',
  'document-text': 'description',
  download: 'download',
  duplicate: 'content_copy',
  ellipse: 'radio_button_unchecked',
  'ellipse-outline': 'radio_button_unchecked',
  'fast-food-outline': 'fastfood',
  fitness: 'fitness_center',
  flag: 'flag',
  'flag-outline': 'flag',
  flame: 'local_fire_department',
  'flame-outline': 'local_fire_department',
  flash: 'flash_on',
  'flash-off': 'flash_off',
  'flask-outline': 'science',
  heart: 'favorite',
  'heart-outline': 'favorite',
  'help-buoy-outline': 'help',
  'help-circle': 'help',
  'hourglass-outline': 'hourglass_empty',
  'images-outline': 'photo_library',
  'information-circle': 'info',
  'information-circle-outline': 'info',
  leaf: 'eco',
  'leaf-outline': 'eco',
  'lock-closed': 'lock',
  'lock-closed-outline': 'lock',
  'log-out-outline': 'logout',
  mail: 'mail',
  'mail-unread': 'mark_email_unread',
  'medkit-outline': 'medication',
  mic: 'mic',
  'mic-outline': 'mic',
  'moon-outline': 'dark_mode',
  notifications: 'notifications',
  'notifications-outline': 'notifications',
  nutrition: 'nutrition',
  'nutrition-outline': 'nutrition',
  'options-outline': 'tune',
  'pause-circle-outline': 'pause_circle',
  person: 'person',
  'person-outline': 'person',
  'pulse-outline': 'monitor_heart',
  'radio-button-off': 'radio_button_unchecked',
  'radio-button-on': 'radio_button_checked',
  refresh: 'refresh',
  remove: 'remove',
  'remove-circle-outline': 'remove_circle',
  repeat: 'repeat',
  restaurant: 'restaurant',
  'restaurant-outline': 'restaurant',
  scale: 'monitor_weight',
  'scan-outline': 'center_focus_weak',
  search: 'search',
  'search-outline': 'search',
  send: 'send',
  settings: 'settings',
  'settings-outline': 'settings',
  'share-social': 'share',
  'shield-checkmark-outline': 'shield',
  sparkles: 'auto_awesome',
  'sparkles-outline': 'auto_awesome',
  'square-outline': 'check_box_outline_blank',
  star: 'star',
  'star-outline': 'star',
  'stop-circle': 'stop_circle',
  'sunny-outline': 'light_mode',
  'swap-horizontal': 'swap_horiz',
  text: 'text_fields',
  time: 'schedule',
  'time-outline': 'schedule',
  today: 'today',
  trash: 'delete',
  'trash-outline': 'delete',
  'trending-down': 'trending_down',
  'trending-up': 'trending_up',
  'trending-up-outline': 'trending_up',
  trophy: 'emoji_events',
  'trophy-outline': 'emoji_events',
  walk: 'directions_walk',
  warning: 'warning',
  water: 'water_drop',
  'water-outline': 'water_drop',
};

const isSymbol = (name: string): name is SymbolName => name in glyphMap;

/** The Material Symbol shown for a name (legacy Ionicons names included), if any. */
export function symbolFor(name: IconName): SymbolName | null {
  if (isSymbol(name)) return name;
  return FROM_IONICONS[name as IonName] ?? null;
}

export interface IconProps {
  name: IconName;
  size?: number;
  color?: keyof ThemeColors;
  rawColor?: string;
}

export function Icon({ name, size = 22, color = 'text', rawColor }: IconProps) {
  const theme = useTheme();
  const tint = rawColor ?? theme.colors[color];
  const symbol = symbolFor(name);
  const a11y = { accessibilityElementsHidden: true, importantForAccessibility: 'no' } as const;
  return symbol ? (
    <Symbols name={symbol} size={size} color={tint} {...a11y} />
  ) : (
    <Ionicons name={name as IonName} size={size} color={tint} {...a11y} />
  );
}
