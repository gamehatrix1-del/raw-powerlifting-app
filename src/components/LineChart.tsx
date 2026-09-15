import Svg, { Circle, Line, Polyline } from "react-native-svg";
import { colors } from "../theme/colors";

interface Point {
  value: number;
}

export default function LineChart({
  points,
  width,
  height = 120,
}: {
  points: Point[];
  width: number;
  height?: number;
}) {
  const padding = 12;
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

  return (
    <Svg width={width} height={height}>
      <Line
        x1={padding}
        y1={height - padding}
        x2={width - padding}
        y2={height - padding}
        stroke={colors.card}
        strokeWidth={1}
      />
      {points.length > 1 && (
        <Polyline
          points={polylinePoints}
          fill="none"
          stroke={colors.accent}
          strokeWidth={2}
        />
      )}
      {coords.map((c, i) => (
        <Circle key={i} cx={c.x} cy={c.y} r={3} fill={colors.accent} />
      ))}
    </Svg>
  );
}
