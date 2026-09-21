import {
  buildRecoupmentExample,
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  formatMoney,
  RECOUPMENT_SOURCES,
  RECOUPMENT_SOURCE_LABELS,
  type ExpenseCategory,
  type RecoupmentSource,
} from '@altar/shared';
import { Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button.js';
import { Callout } from '../../components/ui/Callout.js';
import { Card, CardBody, CardHeader } from '../../components/ui/Card.js';
import {
  Checkbox,
  Field,
  RadioGroup,
  Select,
  TextArea,
  TextInput,
} from '../../components/ui/Field.js';
import { Term } from '../../components/ui/Term.js';
import { api } from '../../lib/api.js';
import { cn } from '../../lib/cn.js';
import { useMutation } from '../../lib/useApi.js';
import { useSong } from './SongLayout.js';

interface PlannedExpense {
  category: ExpenseCategory;
  description: string;
  amountMinor: number;
  recoupable: boolean;
}

/** Spec §11 — what happens when Altar.Camp spends money, with a worked example before signing. */
export function ExpensesStep() {
  const { deal, reload } = useSong();
  const navigate = useNavigate();
  const terms = deal.recoupment.terms;

  const [recoupable, setRecoupable] = useState(terms.recoupable);
  const [recoupedFrom, setRecoupedFrom] = useState<RecoupmentSource>(terms.recoupedFrom);
  const [personallyLiable, setPersonallyLiable] = useState(terms.artistPersonallyLiable);
  const [cap, setCap] = useState(
    terms.investmentCapMinor === null ? '' : String(terms.investmentCapMinor / 100),
  );
  const [afterRecoupment, setAfterRecoupment] = useState(terms.afterRecoupment);
  const [expenses, setExpenses] = useState<PlannedExpense[]>(
    deal.recoupment.plannedExpenses.map((expense) => ({
      category: expense.category as ExpenseCategory,
      description: expense.description,
      amountMinor: expense.amountMinor,
      recoupable: expense.recoupable,
    })),
  );
  const [acknowledged, setAcknowledged] = useState(Boolean(deal.recoupment.acknowledgedAt));

  const artistShareBps = useMemo(() => {
    const primary =
      deal.revenueSplits.find((split) => split.category === 'master_streaming') ??
      deal.revenueSplits[0];
    const artist = deal.contributors.find((contributor) => contributor.role === 'primary_artist');
    if (!primary || !artist) return 5_000;
    return primary.lines
      .filter((line) => line.participantId === artist.id)
      .reduce((total, line) => total + line.bps, 0);
  }, [deal]);

  const counterpartyLabel = useMemo(() => {
    const primary =
      deal.revenueSplits.find((split) => split.category === 'master_streaming') ??
      deal.revenueSplits[0];
    return primary && primary.lines.length > 2
      ? 'Altar.Camp and other participants'
      : 'Altar.Camp share';
  }, [deal]);

  const recoupableTotal = expenses
    .filter((expense) => expense.recoupable)
    .reduce((total, expense) => total + expense.amountMinor, 0);

  const example = useMemo(
    () =>
      buildRecoupmentExample({
        grossRevenueMinor: 1_000_000,
        distributionCostMinor: 100_000,
        recoupableExpensesMinor: recoupableTotal || 200_000,
        artistShareBps,
        terms: {
          recoupedFrom: recoupable ? recoupedFrom : 'not_recoupable',
          artistPersonallyLiable: personallyLiable,
        },
        counterpartyLabel,
      }),
    [
      recoupableTotal,
      artistShareBps,
      recoupable,
      recoupedFrom,
      personallyLiable,
      counterpartyLabel,
    ],
  );

  const save = useMutation(async () =>
    api.put(`/songs/${deal.song.id}/recoupment`, {
      payer: 'altar',
      recoupable,
      recoupedFrom: recoupable ? recoupedFrom : 'not_recoupable',
      artistPersonallyLiable: personallyLiable,
      afterRecoupment,
      investmentCapMinor: cap.trim() === '' ? null : Math.round(Number.parseFloat(cap) * 100),
      plannedExpenses: expenses,
      acknowledged,
    }),
  );

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:items-start">
        <div className="grid gap-4">
          <Card>
            <CardHeader
              title="What Altar.Camp plans to spend"
              description="Studio time, mixing, artwork, marketing — whatever this record needs."
            />
            <CardBody className="grid gap-3">
              {expenses.map((expense, index) => (
                <div
                  key={index}
                  className="grid gap-2 rounded-lg border border-ink-200 p-3 sm:grid-cols-[10rem_1fr_8rem_auto]"
                >
                  <Select
                    value={expense.category}
                    aria-label="Cost type"
                    onChange={(event) =>
                      setExpenses(
                        expenses.map((entry, position) =>
                          position === index
                            ? { ...entry, category: event.target.value as ExpenseCategory }
                            : entry,
                        ),
                      )
                    }
                  >
                    {EXPENSE_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {EXPENSE_CATEGORY_LABELS[category]}
                      </option>
                    ))}
                  </Select>
                  <TextInput
                    value={expense.description}
                    placeholder="What it covers"
                    aria-label="Description"
                    onChange={(event) =>
                      setExpenses(
                        expenses.map((entry, position) =>
                          position === index
                            ? { ...entry, description: event.target.value }
                            : entry,
                        ),
                      )
                    }
                  />
                  <TextInput
                    type="number"
                    min={0}
                    step="0.01"
                    aria-label="Amount"
                    value={expense.amountMinor / 100}
                    onChange={(event) =>
                      setExpenses(
                        expenses.map((entry, position) =>
                          position === index
                            ? {
                                ...entry,
                                amountMinor: Math.round(
                                  Number.parseFloat(event.target.value || '0') * 100,
                                ),
                              }
                            : entry,
                        ),
                      )
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setExpenses(expenses.filter((_, position) => position !== index))
                    }
                    className="justify-self-start rounded p-2 text-ink-500 hover:bg-clay-50 hover:text-clay-700"
                    aria-label="Remove this cost"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              ))}

              <Button
                variant="secondary"
                size="sm"
                className="justify-self-start"
                onClick={() =>
                  setExpenses([
                    ...expenses,
                    { category: 'recording', description: '', amountMinor: 0, recoupable: true },
                  ])
                }
              >
                <Plus className="size-4" aria-hidden />
                Add a cost
              </Button>

              <div className="mt-2 flex items-center justify-between rounded-lg bg-ink-100 px-4 py-3 font-semibold text-ink-900">
                <span>Recoupable total</span>
                <span className="tabular-nums">{formatMoney(recoupableTotal)}</span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="How that money comes back" />
            <CardBody className="grid gap-5">
              <Checkbox
                checked={recoupable}
                onChange={(event) => setRecoupable(event.target.checked)}
                label="Altar.Camp recovers these costs from revenue"
                description="Turn this off and Altar.Camp carries the costs itself, with nothing recovered from your income."
              />

              {recoupable ? (
                <div>
                  <p className="mb-2 text-sm font-medium text-ink-900">Recovered from</p>
                  <RadioGroup
                    name="recoupedFrom"
                    value={recoupedFrom}
                    onChange={setRecoupedFrom}
                    options={RECOUPMENT_SOURCES.filter((source) => source !== 'not_recoupable').map(
                      (source) => ({
                        value: source,
                        label: RECOUPMENT_SOURCE_LABELS[source],
                        description:
                          source === 'artist_share_only'
                            ? 'Harder on the artist: the whole cost comes out of your half, not off the top.'
                            : source === 'master_revenue'
                              ? 'Costs come out before the split, so both sides carry them proportionally.'
                              : undefined,
                      }),
                    )}
                  />
                </div>
              ) : null}

              <Checkbox
                checked={personallyLiable}
                onChange={(event) => setPersonallyLiable(event.target.checked)}
                label="The artist personally owes any shortfall"
                description="Altar.Camp's default is that you do not. If the music never earns it back, that is the label's loss."
              />

              <Field
                label="Altar.Camp's investment cap"
                hint="Leave blank to agree budgets project by project."
              >
                {(props) => (
                  <TextInput
                    {...props}
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="5000"
                    value={cap}
                    onChange={(event) => setCap(event.target.value)}
                  />
                )}
              </Field>

              <Field label="What happens once it is repaid">
                {(props) => (
                  <TextArea
                    {...props}
                    rows={2}
                    value={afterRecoupment}
                    onChange={(event) => setAfterRecoupment(event.target.value)}
                  />
                )}
              </Field>
            </CardBody>
          </Card>
        </div>

        <div className="grid h-fit gap-4">
          <Card>
            <CardHeader
              title="If this song earned $10,000"
              description="The same maths the platform will use when real money arrives."
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
                    <dt className="text-sm text-ink-800">
                      {row.label}
                      {row.note ? (
                        <span className="block text-xs text-ink-600">{row.note}</span>
                      ) : null}
                    </dt>
                    <dd
                      className={cn(
                        'shrink-0 tabular-nums',
                        row.kind === 'deduction' ? 'text-clay-700' : 'text-ink-950',
                      )}
                    >
                      {formatMoney(row.amountMinor)}
                    </dd>
                  </div>
                ))}
              </dl>

              {example.unrecoupedBalanceMinor > 0 ? (
                <Callout tone={personallyLiable ? 'blocker' : 'info'} className="mt-4">
                  {personallyLiable
                    ? `${formatMoney(example.unrecoupedBalanceMinor)} would still be owed by you.`
                    : `${formatMoney(example.unrecoupedBalanceMinor)} would remain unrecovered — absorbed by Altar.Camp, not owed by you.`}
                </Callout>
              ) : null}

              <p className="mt-4 text-sm text-ink-700">
                <Term termKey="recoupment" /> is where most artists get surprised. Read this table
                until it is boring.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>

      <Card>
        <CardBody className="grid gap-4">
          <Checkbox
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
            label="I have read how costs and recoupment work on this song"
            description="An agreement cannot be generated until this is ticked."
          />

          {save.error ? <Callout tone="blocker">{save.error.message}</Callout> : null}

          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              disabled={save.pending}
              onClick={async () => {
                const result = await save.run(undefined);
                if (result !== null) reload();
              }}
            >
              {save.pending ? 'Saving…' : 'Save the terms'}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate(`/songs/${deal.song.id}/deal`)}
            >
              See the deal summary
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
