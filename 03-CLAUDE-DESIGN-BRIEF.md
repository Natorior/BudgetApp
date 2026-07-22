# Claude Design Brief

Product: a private budgeting app for one person, installed on an iPhone.
Read `01-PROJECT-SPEC.md` for what each screen does. This document covers only how it looks and feels.

---

## The one-sentence brief

A ledger, not a dashboard: the app's job is to let one person answer "am I okay this month?" in under three seconds, and then let them dig if they want to.

## Who is looking at it

A 22-year-old software engineer with irregular income (contract work plus creator revenue) who checks the app at night on a phone, usually one-handed, usually right after spending money. He has already rejected a competitor for being visually noisy and mathematically wrong. He is not anxious about money but he is precise about it, and he will notice a rounding error.

## Tone

Quiet, precise, unhurried. The app never congratulates you and never scolds you. It states what happened. The most emotionally loaded thing on screen should be a number, not a color or an exclamation point.

---

## Design direction: "Statement"

The reference is a well-set financial statement, not a fintech marketing site. Strong horizontal structure, generous vertical rhythm, figures that align down the page, hairline rules doing the work that boxes and cards usually do.

**Where the personality lives:** typography and structure, not color. In a finance app every color has to carry meaning (income, overspend, category identity), so there is no color left over for decoration. Spend the character budget on the type treatment and one signature component instead. This is a deliberate choice, not a limitation.

**Explicitly forbidden**, per the client:
- Glows, neon, bloom, any `box-shadow` with a colored spread
- Decorative gradients (a gradient may only encode data, and even then prefer solid fills)
- Glassmorphism, blur-behind panels, frosted headers
- Rounded pill-shaped cards stacked in a tile grid (this is the competitor's look and it wastes vertical space on a phone)
- Emoji as category icons
- Confetti, streaks, badges, progress celebrations, any gamification
- Animation longer than 200ms or that moves more than 8px

---

## Tokens

### Color, dark theme (primary)

```
--bg              #101318   page background, deep slate ink
--surface         #171B22   cards, sheets
--surface-raised  #1E232C   inputs, hovered rows, chart backdrops
--border          #262C36   hairlines, dividers
--border-strong   #333A46   focused inputs, selected states

--text            #E9ECF1   primary figures and labels
--text-secondary  #98A1B0   secondary labels, dates, captions
--text-tertiary   #5F6875   disabled, placeholder, axis labels

--accent          #5B8DEF   interactive only: buttons, links, selected tab, focus ring
--accent-quiet    #1C2740   accent-tinted fill for selected rows

--positive        #4E9E76   income, money in, under budget
--warning         #E0A44C   ahead of pace, approaching budget
--critical        #D4614F   over budget, failed sync, needs reauth
```

Two rules that matter more than the hexes:

1. **Ordinary spending is never red.** Outflow renders in `--text`, the same as everything else. Red is reserved for a state that requires action. If every purchase is red, red stops meaning anything, and the app starts feeling like it is judging you.
2. **Green is income only.** Not "good", not "positive trend". Income.

### Light theme

Same structure, invert the neutrals. `--bg #FBFBFC`, `--surface #FFFFFF`, `--border #E6E8EC`, `--text #14181F`, `--text-secondary #616B7A`. Semantic colors darken one step for AA contrast on white: `--positive #2F7D57`, `--warning #B87A22`, `--critical #B84A39`, `--accent #3B6FD4`. Follow the system setting, with a manual override in Settings.

### Category palette

Eight muted hues at matched luminance so a stacked chart reads as one coherent object rather than a bag of highlighters. Assign in order, cycle after eight, and lock the assignment per category so a category is the same color everywhere in the app, forever.

```
#5B8DEF  #4E9E76  #C77DBB  #E0A44C  #6BB3C4  #8B85D9  #C97A5E  #7E8896
```

Never rely on color alone to distinguish categories. Every chart segment gets a label or a legend entry with its name.

### Typography

```
UI and labels     Geist Sans        (variable, free)
All money figures Geist Mono        (variable, free, true tabular figures)
```

**The signature type rule: every dollar amount in the app is set in Geist Mono.** Amounts align down the right edge of any list, digits sit in fixed columns so numbers do not shimmer when they update, and the app immediately reads as a ledger rather than as another rounded-sans budget app. This costs nothing and it is the single most identity-defining decision in the brief.

Scale (mobile):
```
Hero figure      44 / 44   Geist Mono, 500, -0.02em   the one number per screen
Section figure   28 / 32   Geist Mono, 500
Row figure       16 / 20   Geist Mono, 450, tabular
Title            20 / 26   Geist Sans, 600
Body             15 / 22   Geist Sans, 400
Label            13 / 18   Geist Sans, 500
Eyebrow          11 / 14   Geist Sans, 600, +0.08em, uppercase, --text-secondary
```

Sentence case everywhere except eyebrows. No title case, no ALL CAPS body text.

### Space, radius, motion

```
Spacing scale     4 8 12 16 24 32 48        (nothing off-scale)
Screen gutter     20px
Radius            card 12  input 10  chip 8  bar 3
Border            1px, --border, always hairline
Elevation         one level only: 0 1px 2px rgba(0,0,0,.24). Sheets get a scrim, not a bigger shadow.
Motion            150ms ease-out for state, 200ms for sheets. Nothing else animates.
Tap target        44 x 44 minimum, always
```

---

## The signature component: Month Rail

One horizontal component that appears on Home, Budget, and Insights, always the same geometry, always the same reading. It is how the app is recognized.

```
JULY                                        22 of 31 days
                                                     |
  in    ████████████████████████████████             |
        $1,963                                       |
                                                     |
  out   ████████████████████░░░░░░░░░░░░░░░░░░░░░    |
        $1,257 of $2,000 budget                      |
                                            ▲ today
```

Specification:
- Two stacked bars on one shared x-scale, so income and spend are directly comparable by length. This is the thing pie charts cannot do.
- The **in** bar is a solid `--positive` fill.
- The **out** bar is segmented by bucket (needs / wants / savings) in category colors, with the remaining budget shown as `--border` at 40% opacity.
- A 1px vertical `--text-secondary` tick marks percent-of-month-elapsed, spanning both bars. If the filled portion of **out** is past the tick, the tick's label reads "ahead of pace".
- The out bar turns `--critical` only when it exceeds 100% of budget, and only the overage portion.
- Height 10px, radius 3, no inner shadow, no shine, no animation on load beyond a 150ms width transition.

Everything else on screen stays quiet so this reads first.

---

## Scope switcher

The person runs a game development side business through the same bank accounts as his personal spending. A three-way segmented control sits in the header on Home, Transactions, and Insights:

```
┌─────────────────────────────────────┐
│   All   │  Personal  │  Business    │
└─────────────────────────────────────┘
```

- 32px tall, `--surface-raised` track, selected segment gets `--surface` fill and `--text`, unselected `--text-secondary`. No accent color: this is a lens, not an action.
- Changing scope does not animate the numbers counting up. It swaps them. A 150ms crossfade at most.
- When scope is Business, the header eyebrow reads `BUSINESS · GAME DEVELOPMENT` so there is never doubt about which numbers you are looking at. Misreading a business figure as a personal one is the failure this control exists to prevent.

**Entity on a transaction row.** Business rows carry a small outlined chip reading `Business`, `--text-secondary` text on a transparent fill with a hairline border. Personal rows carry nothing, because personal is the default and marking the default is noise.

```
┌──────────────────────────────────────────────┐
│ Adobe                                -21.31  │
│ Subscriptions · Jul 20 · ⌐Business¬          │
└──────────────────────────────────────────────┘
```

Do not tint the whole row. Category color already has a job.

## Layout: rows, not tiles

The competitor uses a three-column grid of colored tiles. It looks lively in a screenshot and it is bad on a phone: six transactions fill a screen, amounts do not align, and the color-coded backgrounds fight the category colors for meaning.

Use full-width rows separated by hairlines instead. Fifteen transactions per screen, amounts aligned in a right-hand column, category conveyed by a small chip rather than by tinting the whole surface.

```
┌──────────────────────────────────────────────┐
│ Chipotle                             -12.68  │
│ Dining Out · Jul 14                          │
├──────────────────────────────────────────────┤
│ Nintendo                             -34.99  │
│ Gaming · Jul 21                              │
├──────────────────────────────────────────────┤
│ ACH Transfer                        +823.44  │  ← transfer: amount in
│ Transfer · Jul 22 · paired          ⇄        │    --text-tertiary, muted row
└──────────────────────────────────────────────┘
```

Pending transactions: 1px dashed left border, `--text-secondary` amount, small "pending" label.
Transfers: dimmed to tertiary text with a ⇄ glyph. Present in the ledger, visibly absent from the math.

---

## Screen sketches

### Home

```
┌──────────────────────────────────────────────┐
│ JULY                                    ⋯    │
│                                              │
│ Net this month                               │
│ +$706                                        │  hero, Geist Mono 44
│ $1,963 in · $1,257 out                       │
│                                              │
│ [ MONTH RAIL ]                               │
│                                              │
│ ─────────────────────────────────────────    │
│ 9 to review                              →   │  only if count > 0
│ ─────────────────────────────────────────    │
│                                              │
│ SAFE TO SPEND                                │
│ $743  ·  $82/day for 9 days              ⓘ   │
│                                              │
│ ACCOUNTS                            $8,076   │
│ PNC Checking                         1,992   │
│ PNC Savings                              0   │
│ Chase •4821                            -84   │
│ Capital One •7710                        0   │
│ Fidelity                             6,168   │
│                                              │
│ RECENT                              View all │
│ [ six transaction rows ]                     │
└──────────────────────────────────────────────┘
```

The ⓘ next to safe-to-spend opens a plain-language explanation of the formula. Never show a computed number the person cannot audit.

### Budget

Month selector, total with an allocation rail, then category lines sorted by percent-of-budget descending so whatever is going wrong is at the top:

```
Transportation                    $421 of $300
████████████████████████│█████████            over by $121
                        ▲ pace

Dining Out                        $121 of $200
████████████│███████░░░░░░░░░░░░░              on pace
            ▲ pace
```

### Business

A profit and loss statement, not a budget. The month rail does not appear here: business revenue is not something you allocate against, so borrowing the budget vocabulary would be dishonest.

```
┌──────────────────────────────────────────────┐
│ BUSINESS · GAME DEVELOPMENT          2026 ▾  │
│                                              │
│ Net profit                                   │
│ +$10,365                                     │  hero
│ $14,280 revenue · $3,915 expenses · 73%      │
│                                              │
│ ─────────────────────────────────────────    │
│ TAX RESERVE                                  │
│ $1,200 set aside of $3,110 target        ⓘ   │
│ ████████████░░░░░░░░░░░░░░░░░░░░░░           │
│ Short by $1,910                              │  --warning, not --critical
│                                              │
│ REVENUE BY SOURCE                            │
│ Epic creator payouts     11,900  ██████████  │
│ Client contracts          2,380  ██          │
│                                              │
│ EXPENSES                                     │
│ Software and subs         1,464  line 18     │
│ Contract labor              900  line 11     │
│ Supplies and assets         786  line 22     │
│                                              │
│ [ 12-month revenue vs expense bars ]         │
└──────────────────────────────────────────────┘
```

The reserve bar uses `--warning` when short, `--positive` when met. Never `--critical`: being behind on a self-imposed reserve is a nudge, not an emergency. The ⓘ opens plain text explaining that this is a savings target the person set, not a calculated tax bill.

### Export

A form that shows you what you are about to get. The preview is the point.

```
┌──────────────────────────────────────────────┐
│ Export                                       │
│                                              │
│ PRESETS                                      │
│ [ Business YTD ] [ Tax package ] [ + Save ]  │
│                                              │
│ Date range        Year to date          ▾    │
│ Entity            Business              ▾    │
│ Categories        All (24)              ▾    │
│ Accounts          All (5)               ▾    │
│                                              │
│ ☐ Include transfers                          │
│ ☐ Include pending                            │
│                                              │
│ Format            CSV per category      ▾    │
│                                              │
│ ─────────────────────────────────────────    │
│ PREVIEW                                      │
│ 312 rows · Jan 1 to Jul 22                   │
│ +$14,280 in · -$3,915 out · net +$10,365     │
│                                              │
│ Jul 20   Adobe          Subscriptions -21.31 │
│ Jul 14   Amazon         Supplies       -7.99 │
│ ...                                          │
│                                              │
│           [ Download 6 files (zip) ]         │
└──────────────────────────────────────────────┘
```

- Multi-selects that are empty read "All (24)", never blank. Ambiguity here produces the wrong file.
- The preview totals update live and use the same figures as the rest of the app. Seeing them match is what builds trust in the export.
- Zero rows disables the button and the preview area says which filter is excluding everything.
- The download button names the actual output: "Download 6 files (zip)", not "Export".

### Insights

Cash flow bars, category trend, net worth line, recurring list, income by source, then Claude cards. Claude cards get a hairline top rule and a small label: "Generated from July data · Jul 31". A person should always be able to tell at a glance which numbers were computed and which were written.

---

## Empty and error states

- **No transactions yet:** "Import a CSV or connect an account to get started." Two buttons. Not an illustration.
- **No insights:** show nothing. Do not render a card that says there is nothing to say.
- **Connection broken:** amber row on Home, states which institution, one button labeled "Reconnect PNC". Names the fix, not the failure.
- **Sync failed:** shows the last successful sync time. Stale data is always labeled as stale.

Errors do not apologize and are never vague. They say what happened and what to do.

---

## What to deliver

1. Home, Transactions, Transaction detail sheet, Budget, Business, Insights, Export, Settings. Dark theme.
2. Home and Budget in light theme, to prove the token set inverts cleanly.
3. Review mode: the full-screen single-transaction categorization card, including the entity control.
4. The Month Rail component in five states: under budget, on pace, ahead of pace, over budget, no budget set.
5. Transactions screen in multi-select state, with the bulk action bar showing Recategorize, Assign to business, and Assign to personal.
6. The split editor: one transaction divided across two categories and two entities, with the running remainder shown until it reaches zero.
7. Component sheet: buttons, category chip, entity chip, scope switcher (all three states), transaction row (default / pending / transfer / business / selected), pace bar, reserve bar, account row, input, multi-select dropdown, bottom tab bar, sheet header.
6. Token export as CSS custom properties, ready to paste into `globals.css`.

Design at 390 x 844. Every tap target 44pt or larger. Check every text-on-color pair against WCAG AA before you call it done.
