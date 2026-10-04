import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { fontFamily, useTheme } from '@/theme';

export interface LineSeries {
  points: { x: number; y: number }[];
  color: string;
  dashed?: boolean;
  showDots?: boolean;
  fill?: boolean;
  width?: number;
}

export interface LineChartProps {
  series: LineSeries[];
  height?: number;
  /** Horizontal reference line (e.g. goal weight). */
  reference?: { y: number; color: string; label?: string };
  xLabels?: { x: number; label: string }[];
  yFormat?: (v: number) => string;
  accessibilityLabel: string;
}

const PAD = { top: 12, right: 12, bottom: 22, left: 40 };

export function LineChart({
  series,
  height = 180,
  reference,
  xLabels = [],
  yFormat = (v) => String(Math.round(v)),
  accessibilityLabel,
}: LineChartProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const all = series.flatMap((s) => s.points);
  const ys = [...all.map((p) => p.y), ...(reference ? [reference.y] : [])];
  const xs = all.map((p) => p.x);
  const minX = Math.min(...xs, 0);
  const maxX = Math.max(...xs, 1);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);
  if (!Number.isFinite(minY) || !Number.isFinite(maxY)) {
    minY = 0;
    maxY = 1;
  }
  const span = Math.max(maxY - minY, 1);
  minY -= span * 0.1;
  maxY += span * 0.1;

  const w = Math.max(0, width - PAD.left - PAD.right);
  const h = height - PAD.top - PAD.bottom;
  const sx = (x: number) => PAD.left + ((x - minX) / Math.max(maxX - minX, 1)) * w;
  const sy = (y: number) => PAD.top + (1 - (y - minY) / (maxY - minY)) * h;

  const pathFor = (pts: { x: number; y: number }[]) =>
    pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`)
      .join(' ');

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const gridYs = [minY + (maxY - minY) * 0.2, (minY + maxY) / 2, maxY - (maxY - minY) * 0.2];

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
          <Defs>
            {series.map((s, i) => (
              <LinearGradient key={i} id={`fill${i}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={s.color} stopOpacity={0.25} />
                <Stop offset="1" stopColor={s.color} stopOpacity={0} />
              </LinearGradient>
            ))}
          </Defs>
          {gridYs.map((gy, i) => (
            <Line
              key={i}
              x1={PAD.left}
              x2={width - PAD.right}
              y1={sy(gy)}
              y2={sy(gy)}
              stroke={colors.border}
              strokeWidth={1}
            />
          ))}
          {gridYs.map((gy, i) => (
            <SvgText
              key={`t${i}`}
              x={PAD.left - 6}
              y={sy(gy) + 4}
              fontSize={10}
              fill={colors.textMuted}
              textAnchor="end"
              fontFamily={fontFamily.regular}
            >
              {yFormat(gy)}
            </SvgText>
          ))}
          {reference ? (
            <>
              <Line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={sy(reference.y)}
                y2={sy(reference.y)}
                stroke={reference.color}
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
              {reference.label ? (
                <SvgText
                  x={width - PAD.right}
                  y={sy(reference.y) - 4}
                  fontSize={10}
                  fill={reference.color}
                  textAnchor="end"
                  fontFamily={fontFamily.semibold}
                >
                  {reference.label}
                </SvgText>
              ) : null}
            </>
          ) : null}
          {series.map((s, i) =>
            s.points.length > 1 && s.fill ? (
              <Path
                key={`f${i}`}
                d={`${pathFor(s.points)} L${sx(s.points[s.points.length - 1]!.x)},${PAD.top + h} L${sx(s.points[0]!.x)},${PAD.top + h} Z`}
                fill={`url(#fill${i})`}
              />
            ) : null,
          )}
          {series.map((s, i) => (
            <Path
              key={`l${i}`}
              d={pathFor(s.points)}
              stroke={s.color}
              strokeWidth={s.width ?? 2.5}
              fill="none"
              strokeDasharray={s.dashed ? '6 5' : undefined}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {series.map((s, i) =>
            s.showDots
              ? s.points.map((p, j) => (
                  <Circle key={`d${i}-${j}`} cx={sx(p.x)} cy={sy(p.y)} r={3} fill={s.color} />
                ))
              : null,
          )}
          {xLabels.map((l, i) => (
            <SvgText
              key={`x${i}`}
              x={sx(l.x)}
              y={height - 6}
              fontSize={10}
              fill={colors.textMuted}
              textAnchor="middle"
              fontFamily={fontFamily.regular}
            >
              {l.label}
            </SvgText>
          ))}
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { width: '100%' } });
