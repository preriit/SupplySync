import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react';

const StatCard = ({ title, value, subtitle, icon: Icon, trend, trendValue, iconColor = 'text-orange' }) => {
  return (
    <Card className="hover:shadow-card-hover transition-shadow duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-light">
          {title}
        </CardTitle>
        {Icon && <Icon className={`h-5 w-5 ${iconColor}`} />}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-display font-bold text-slate">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {trend && trendValue && (
          <div className="flex items-center mt-2">
            {trend === 'up' ? (
              <ArrowUpIcon className="h-4 w-4 text-green-600 mr-1" />
            ) : (
              <ArrowDownIcon className="h-4 w-4 text-red-600 mr-1" />
            )}
            <span className={`text-sm font-medium ${
              trend === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              {trendValue}
            </span>
            <span className="text-xs text-muted-foreground ml-1">from last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;
