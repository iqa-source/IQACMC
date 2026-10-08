import React, { useState } from 'react';
import { ProjectItem, PROJECT_STATUSES, STATUS_COLORS, ProjectStatus } from '../types';

interface StatusPieChartProps {
  projects: ProjectItem[];
  onSelectStatus?: (status: ProjectStatus | null) => void;
  selectedStatus?: ProjectStatus | null;
}

export const StatusPieChart: React.FC<StatusPieChartProps> = ({
  projects,
  onSelectStatus,
  selectedStatus,
}) => {
  const [hoveredStatus, setHoveredStatus] = useState<ProjectStatus | null>(null);

  // Group counts by status
  const counts: Record<ProjectStatus, number> = PROJECT_STATUSES.reduce(
    (acc, status) => {
      acc[status] = 0;
      return acc;
    },
    {} as Record<ProjectStatus, number>
  );

  projects.forEach((p) => {
    if (counts[p.status] !== undefined) {
      counts[p.status] += 1;
    }
  });

  const total = projects.length;

  // Build slices for non-zero counts
  let cumulativeAngle = 0;
  const slices = PROJECT_STATUSES.map((status) => {
    const count = counts[status];
    const percentage = total > 0 ? (count / total) * 100 : 0;
    const angle = total > 0 ? (count / total) * 360 : 0;
    const startAngle = cumulativeAngle;
    cumulativeAngle += angle;
    const endAngle = cumulativeAngle;

    return {
      status,
      count,
      percentage,
      angle,
      startAngle,
      endAngle,
      color: STATUS_COLORS[status].chartColor,
    };
  }).filter((s) => s.count > 0);

  // Helper for polar to cartesian coordinates
  const getCoordinatesForAngle = (angleInDegrees: number, radius: number, center: number) => {
    // Start from top (angle - 90)
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: center + radius * Math.cos(angleInRadians),
      y: center + radius * Math.sin(angleInRadians),
    };
  };

  const center = 110;
  const outerRadius = 85;
  const innerRadius = 52;

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-saas">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
            สัดส่วนสถานะโครงการทั้งหมด (Status Distribution)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            สรุปสถานะการดำเนินงานของโครงการในปีการศึกษาที่เลือก
          </p>
        </div>
        {selectedStatus && (
          <button
            onClick={() => onSelectStatus && onSelectStatus(null)}
            className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline font-semibold self-start cursor-pointer"
          >
            ล้างตัวกรองสถานะ
          </button>
        )}
      </div>

      {total === 0 ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          ไม่มีข้อมูลโครงการในปีการศึกษานี้
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* SVG Pie / Donut Chart */}
          <div className="md:col-span-5 flex justify-center items-center relative">
            <svg
              width="220"
              height="220"
              viewBox="0 0 220 220"
              className="transform drop-shadow-sm select-none"
            >
              {slices.map((slice) => {
                const isHovered = hoveredStatus === slice.status;
                const isSelected = selectedStatus === slice.status;
                const currentOuterRadius = isHovered || isSelected ? outerRadius + 4 : outerRadius;

                // Handle single 100% slice edge case
                if (slice.angle >= 359.99) {
                  return (
                    <circle
                      key={slice.status}
                      cx={center}
                      cy={center}
                      r={(currentOuterRadius + innerRadius) / 2}
                      fill="none"
                      stroke={slice.color}
                      strokeWidth={currentOuterRadius - innerRadius}
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setHoveredStatus(slice.status)}
                      onMouseLeave={() => setHoveredStatus(null)}
                      onClick={() => onSelectStatus && onSelectStatus(slice.status === selectedStatus ? null : slice.status)}
                    />
                  );
                }

                const startOuter = getCoordinatesForAngle(slice.startAngle, currentOuterRadius, center);
                const endOuter = getCoordinatesForAngle(slice.endAngle, currentOuterRadius, center);
                const startInner = getCoordinatesForAngle(slice.endAngle, innerRadius, center);
                const endInner = getCoordinatesForAngle(slice.startAngle, innerRadius, center);

                const largeArcFlag = slice.angle > 180 ? 1 : 0;

                const pathData = [
                  `M ${startOuter.x} ${startOuter.y}`,
                  `A ${currentOuterRadius} ${currentOuterRadius} 0 ${largeArcFlag} 1 ${endOuter.x} ${endOuter.y}`,
                  `L ${startInner.x} ${startInner.y}`,
                  `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${endInner.x} ${endInner.y}`,
                  'Z',
                ].join(' ');

                return (
                  <path
                    key={slice.status}
                    d={pathData}
                    fill={slice.color}
                    className="cursor-pointer transition-all duration-200 hover:opacity-90"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    onMouseEnter={() => setHoveredStatus(slice.status)}
                    onMouseLeave={() => setHoveredStatus(null)}
                    onClick={() => onSelectStatus && onSelectStatus(slice.status === selectedStatus ? null : slice.status)}
                  />
                );
              })}

              {/* Center info */}
              <circle cx={center} cy={center} r={innerRadius - 4} fill="#ffffff" />
              <text
                x={center}
                y={center - 6}
                textAnchor="middle"
                className="text-2xl font-black fill-slate-800"
                style={{ fontSize: '24px', fontWeight: 800 }}
              >
                {total}
              </text>
              <text
                x={center}
                y={center + 14}
                textAnchor="middle"
                className="fill-slate-500"
                style={{ fontSize: '11px', fontWeight: 500 }}
              >
                โครงการทั้งหมด
              </text>
            </svg>
          </div>

          {/* Legend and breakdown */}
          <div className="md:col-span-7 space-y-2">
            {PROJECT_STATUSES.map((status) => {
              const count = counts[status];
              const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0';
              const isSelected = selectedStatus === status;
              const isHovered = hoveredStatus === status;

              return (
                <div
                  key={status}
                  onClick={() => onSelectStatus && onSelectStatus(isSelected ? null : status)}
                  onMouseEnter={() => setHoveredStatus(status)}
                  onMouseLeave={() => setHoveredStatus(null)}
                  className={`flex items-center justify-between p-2 rounded-xl transition cursor-pointer border text-xs ${
                    isSelected
                      ? 'bg-indigo-50/80 border-indigo-500 font-semibold text-slate-900 shadow-xs ring-1 ring-indigo-500/20'
                      : isHovered
                      ? 'bg-slate-50 border-slate-300 text-slate-800'
                      : 'bg-transparent border-transparent hover:bg-slate-50/80 text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span
                      className="w-3 h-3 rounded-md shrink-0 shadow-xs"
                      style={{ backgroundColor: STATUS_COLORS[status].chartColor }}
                    />
                    <span className="truncate">{status}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 font-mono">
                    <span className="font-bold text-slate-800">{count}</span>
                    <span className="text-slate-400 w-12 text-right">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
