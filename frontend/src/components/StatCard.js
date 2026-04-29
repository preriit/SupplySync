import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react';

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  sparklineData,
  iconColor = 'text-orange',
  onClick,
  className = '',
}) => {
  const isInteractive = typeof onClick === 'function';
  const hasSparkline = Array.isArray(sparklineData) && sparklineData.length >= 2;

  const sparklinePoints = (() => {
    if (!hasSparkline) return '';
    const width = 100;
    const height = 28;
    const min = Math.min(...sparklineData);
    const max = Math.max(...sparklineData);
    const range = max - min || 1;
    return sparklineData
      .map((point, idx) => {
        const x = (idx / (sparklineData.length - 1)) * width;
        const y = height - ((point - min) / range) * height;
        return `${x},${y}`;
      })
      .join(' ');
  })();

  return (
    <Card
      className={`border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 ${isInteractive ? 'cursor-pointer hover:border-orange/40' : ''} ${className}`}
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={isInteractive ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-4">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {title}
        </CardTitle>
        {Icon && <Icon className={`h-5 w-5 ${iconColor}`} />}
      </CardHeader>
      <CardContent className="pt-0 pb-4">
        <div className="text-2xl md:text-3xl font-display font-bold leading-none text-slate-900">{value}</div>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-1.5">{subtitle}</p>
        )}
        {trend?.direction && trend?.value && (
          <div className="flex items-center mt-2.5 gap-1.5">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              trend.direction === 'up'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {trend.direction === 'up' ? (
                <ArrowUpIcon className="h-3 w-3 mr-1" />
              ) : (
                <ArrowDownIcon className="h-3 w-3 mr-1" />
              )}
              {trend.value}
            </span>
            {trend.label ? <span className="text-xs text-muted-foreground">{trend.label}</span> : null}
          </div>
        )}
        {hasSparkline ? (
          <div className="mt-2.5 rounded-md bg-slate-50 px-2 py-1">
            <svg viewBox="0 0 100 28" className="w-full h-7">
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-orange"
                points={sparklinePoints}
              />
            </svg>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default StatCard;
