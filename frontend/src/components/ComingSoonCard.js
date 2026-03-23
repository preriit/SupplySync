import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, ArrowRight } from 'lucide-react';

/**
 * Reusable "Coming Soon" card.
 *
 * Props:
 * - title: heading text
 * - blurb: primary description
 * - note: secondary witty line
 * - badgeText: small badge line at bottom
 * - icon: Lucide icon component (optional)
 * - actions: [{ label, onClick, icon, variant?, className? }]
 * - variant: "dealer" | "admin"
 */
const ComingSoonCard = ({
  title,
  blurb,
  note,
  badgeText = 'Coming soon.',
  icon: Icon,
  actions = [],
  variant = 'dealer',
}) => {
  const isAdmin = variant === 'admin';

  const cardClass = isAdmin
    ? 'max-w-2xl w-full bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700'
    : 'border-2 border-orange/20 bg-gradient-to-br from-white via-orange-50/30 to-white';

  const titleClass = isAdmin ? 'text-white' : 'text-slate';
  const blurbClass = isAdmin ? 'text-slate-300' : 'text-slate-light';
  const noteClass = isAdmin ? 'text-slate-400' : 'text-slate-light';
  const badgeClass = isAdmin
    ? 'inline-flex items-center gap-2 text-xs text-slate-300 bg-slate-700/50 px-3 py-2 rounded-full border border-slate-600'
    : 'inline-flex items-center gap-2 text-xs text-slate-light bg-white px-3 py-2 rounded-full border';

  return (
    <Card className={cardClass}>
      <CardHeader className="text-center">
        {Icon && (
          <div className="mx-auto w-14 h-14 rounded-full bg-orange text-white flex items-center justify-center shadow-md">
            <Icon className="h-7 w-7" />
          </div>
        )}
        <CardTitle className={`text-3xl font-display mt-4 ${titleClass}`}>
          {title}
        </CardTitle>
      </CardHeader>

      <CardContent className="text-center space-y-5">
        <p className={`${blurbClass} text-lg`}>{blurb}</p>
        {note ? <p className={`${noteClass} text-sm`}>{note}</p> : null}

        {actions.length > 0 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            {actions.map((action) => {
              const ActionIcon = action.icon;
              const variantProp = action.variant || 'default';
              const buttonClass = action.className || '';

              return (
                <Button
                  key={action.label}
                  variant={variantProp}
                  onClick={action.onClick}
                  className={buttonClass}
                >
                  {ActionIcon ? <ActionIcon className="h-4 w-4 mr-2" /> : null}
                  {action.label}
                  {action.trailingArrow ? <ArrowRight className="h-4 w-4 ml-2" /> : null}
                </Button>
              );
            })}
          </div>
        )}

        <div className={badgeClass}>
          <Sparkles className="h-3.5 w-3.5 text-orange" />
          {badgeText}
        </div>
      </CardContent>
    </Card>
  );
};

export default ComingSoonCard;
