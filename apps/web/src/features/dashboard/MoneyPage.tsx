import { buildRecoupmentExample, formatMoney } from '@altar/shared';
import { Callout } from '../../components/ui/Callout.js';
import { Card, CardBody, CardHeader } from '../../components/ui/Card.js';
import { PageHeader } from '../../components/ui/Misc.js';
import { Term } from '../../components/ui/Term.js';
import { cn } from '../../lib/cn.js';

/**
 * Spec §25 is phase 3. Rather than showing a dashboard of invented zeroes, this page is
 * honest about what exists today and shows exactly how the money will be calculated when it
 * arrives — using the same function the accounting will use.
 */
export function MoneyPage() {
  const example = buildRecoupmentExample({
    grossRevenueMinor: 1_000_000,
    distributionCostMinor: 100_000,
    recoupableExpensesMinor: 200_000,
    artistShareBps: 5_000,
    terms: { recoupedFrom: 'master_revenue', artistPersonallyLiable: false },
  });

  return (
    <div>
      <PageHeader
        eyebrow="My money"
        title="Where the money goes"
        description="Royalty accounting opens when your first release starts earning. Until then, here is exactly how it will be worked out — nothing about it is a surprise later."
      />

      <Callout tone="info" className="mb-6" title="Not yet live">
        Revenue import, statements and payouts arrive with the accounting phase. What already exists
        is the part that matters most: every percentage used in this calculation is agreed, approved
        and stored against your signed agreement.
      </Callout>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="The waterfall"
            description="A worked example on $10,000 of master revenue."
          />
          <CardBody>
            <dl className="grid gap-1">
              {example.rows.map((row, index) => (
                <div
                  key={`${row.label}-${index}`}
                  className={cn(
                    'flex items-baseline justify-between gap-4 rounded px-3 py-2',
                    row.kind === 'subtotal' && 'bg-ink-100 font-semibold',
                    row.kind === 'share' && 'bg-moss-50',
                  )}
                >
                  <dt className="text-sm text-ink-800">{row.label}</dt>
                  <dd
                    className={cn(
                      'tabular-nums',
                      row.kind === 'deduction' ? 'text-clay-700' : 'text-ink-950',
                    )}
                  >
                    {formatMoney(row.amountMinor)}
                  </dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="The five questions this page will answer" />
          <CardBody>
            <ol className="grid gap-3 text-ink-800">
              {[
                'How much money did the music generate?',
                'Where did it come from?',
                'What expenses were deducted?',
                'What percentage belongs to me?',
                'What has been paid, and what remains payable?',
              ].map((question, index) => (
                <li key={question} className="flex gap-3">
                  <span className="font-display text-xl text-ember-600">{index + 1}</span>
                  <span>{question}</span>
                </li>
              ))}
            </ol>
            <p className="mt-5 text-sm text-ink-700">
              Calculations will follow the definitions in your own agreement rather than a single
              house formula — <Term termKey="recoupment" /> from gross revenue and recoupment from
              your share are different deals, and the platform treats them differently.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
