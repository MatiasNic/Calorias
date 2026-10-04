import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';

import { fontFamily, useTheme } from '@/theme';

export interface BarDatum {
  label: string;
  value: number;
  /** Optional stacked segments (e.g. macros in kcal); must sum to value. */
  segments?: { value: number; color: string }[];
  highlight?: boolean;
}

export interface BarChartProps {
  data: BarDatum[];
  height?: number;
  target?: number;
  color?: string;
  accessibilityLabel: string;
}

const PAD = { top: 16, bottom: 22, left: 4, right: 4 };

export function BarChart({ data, height = 180, target, color, accessibilityLabel }: BarChartProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const max = Math.max(1, target ?? 0, ...data.map((d) => d.value)) * 1.1;
  const h = height - PAD.top - PAD.bottom;
  const slot = data.length ? (width - PAD.left - PAD.right) / data.length : 0;
  const barW = Math.max(4, Math.min(28, slot * 0.6));
  const y = (v: number) => PAD.top + h - (v / max) * h;
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const showEvery = data.length > 14 ? Math.ceil(data.length / 7) : 1;

  return (
    <View
      onLayout={onLayout}
      style={[styles.wrap, { height }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      {width > 0 ? (
        <Svg width={width} height={height}>
          {data.map((d, i) => {
            const cx = PAD.left + slot * i + slot / 2;
            const x = cx - barW / 2;
            if (d.segments && d.segments.length) {
              let acc = 0;
              return d.segments.map((s, j) => {
                const top = y(acc + s.value);
                const rect = (
                  <Rect
                    key={`${i}-${j}`}
                    x={x}
                    y={top}
                    width={barW}
                    height={Math.max(0, y(acc) - top)}
                    fill={s.color}
                    rx={j === d.segments!.length - 1 ? 4 : 0}
                  />
                );
                acc += s.value;
                return rect;
              });
            }
            return (
              <Rect
                key={i}
                x={x}
                y={y(d.value)}
                width={barW}
                height={Math.max(d.value > 0 ? 2 : 0, PAD.top + h - y(d.value))}
                rx={4}
                fill={d.highlight ? colors.accent : (color ?? colors.primary)}
                opacity={d.value > 0 ? 1 : 0.3}
              />
            );
          })}
          {target ? (
            <Line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={y(target)}
              y2={y(target)}
              stroke={colors.textMuted}
              strokeDasharray="4 4"
              strokeWidth={1.5}
            />
          ) : null}
          {data.map((d, i) =>
            i % showEvery === 0 ? (
              <SvgText
                key={`l${i}`}
                x={PAD.left + slot * i + slot / 2}
                y={height - 6}
                fontSize={10}
                fill={colors.textMuted}
                textAnchor="middle"
                fontFamily={fontFamily.regular}
              >
                {d.label}
              </SvgText>
            ) : null,
          )}
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { width: '100%' } });
