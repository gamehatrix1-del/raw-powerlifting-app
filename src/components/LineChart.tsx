import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Polygon,
  Polyline,
  Stop,
} from "react-native-svg";
import { useTheme } from "../theme/ThemeContext";

interface Point {
  value: number;
}

export default function LineChart({
  points,
  width,
  height = 130,
}: {
  points: Point[];
  width: number;
  height?: number;
}) {
  const { colors } = useTheme();
  const padding = 14;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x =
      points.length === 1
        ? width / 2
        : padding + (i / (points.length - 1)) * (width - padding * 2);
    const y =
      height -
      padding -
      ((p.value - min) / range) * (height - padding * 2);
    return { x, y };
  });

  const polylinePoints = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const areaPoints = `${padding},${height - padding} ${polylinePoints} ${
    width - padding
  },${height - padding}`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.accent} stopOpacity={0.28} />
          <Stop offset="1" stopColor={colors.accent} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Line
        x1={padding}
        y1={height - padding}
        x2={width - padding}
        y2={height - padding}
        stroke={colors.divider}
        strokeWidth={1}
      />
      {points.length > 1 && (
        <>
          <Polygon points={areaPoints} fill="url(#chartFill)" />
          <Polyline
            points={polylinePoints}
            fill="none"
            stroke={colors.accent}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
      {coords.map((c, i) => (
        <Circle
          key={i}
          cx={c.x}
          cy={c.y}
          r={i === coords.length - 1 ? 4.5 : 3}
          fill={colors.accent}
          stroke={colors.card}
          strokeWidth={i === coords.length - 1 ? 2 : 0}
        />
      ))}
    </Svg>
  );
}
