import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useReducedMotion } from 'motion/react'
import { useI18n } from '../core/i18n'
import { displayDate, localDate } from '../core/dates'
import { formatMoney, type Currency } from '../core/money'
import { Amount } from './ui'

const palette = ['#6366f1', 'var(--violet)', 'var(--emerald)', 'var(--amber)', '#557ac4', '#9c73af', '#6b7280']
const tooltipStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)', fontSize: 12, boxShadow: 'var(--shadow)' }

export function MoneyChart({ data, currency, daily = false }: { data: { date: string; income: number; expenses: number }[]; currency: Currency; daily?: boolean }) {
  const { t, locale } = useI18n()
  const reducedMotion = useReducedMotion()
  return <div className="chart-container" data-testid="money-chart"><ResponsiveContainer width="100%" height={245}><BarChart data={data} margin={{ top: 12, right: 5, bottom: 0, left: 5 }} barGap={5}>
    <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 4" />
    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} dy={7} tickFormatter={value => new Intl.DateTimeFormat(locale, daily ? { day: 'numeric', month: 'short' } : { month: 'short' }).format(localDate(String(value)))} />
    <YAxis axisLine={false} tickLine={false} width={65} tick={{ fill: 'var(--muted)', fontSize: 10 }} tickFormatter={value => formatMoney(Number(value), currency, locale, true)} />
    <Tooltip cursor={{ fill: 'var(--surface-soft)', radius: 6 }} contentStyle={tooltipStyle} labelFormatter={value => displayDate(String(value), 'friendly', locale)} formatter={value => formatMoney(Number(value ?? 0), currency, locale)} />
    <Legend iconType="circle" iconSize={7} formatter={value => <span className="chart-legend-label">{value}</span>} wrapperStyle={{ paddingTop: 18, fontSize: 11, color: 'var(--muted)' }} />
    <Bar dataKey="income" name={t('money.income')} fill="var(--emerald)" radius={[5, 5, 0, 0]} maxBarSize={20} isAnimationActive={!reducedMotion} animationDuration={650} />
    <Bar dataKey="expenses" name={t('money.expenses')} fill="#7773e9" radius={[5, 5, 0, 0]} maxBarSize={20} isAnimationActive={!reducedMotion} animationDuration={650} />
  </BarChart></ResponsiveContainer></div>
}

export function CategoryChart({ data, currency }: { data: { name: string; value: number }[]; currency: Currency }) {
  const { categoryLabel, locale } = useI18n()
  const reducedMotion = useReducedMotion()
  const chartData = data.map(record => ({ ...record, name: categoryLabel(record.name) }))
  const total = data.reduce((sum, record) => sum + record.value, 0)
  return <div className="category-chart"><div className="donut-container"><ResponsiveContainer width="100%" height={220}><PieChart><Pie data={chartData} dataKey="value" nameKey="name" innerRadius={64} outerRadius={86} paddingAngle={3} cornerRadius={5} stroke="none" isAnimationActive={!reducedMotion} animationDuration={650}>{chartData.map((record, index) => <Cell key={record.name} fill={palette[index % palette.length]} />)}</Pie><Tooltip contentStyle={tooltipStyle} formatter={value => formatMoney(Number(value ?? 0), currency, locale)} /></PieChart></ResponsiveContainer><div className="donut-centre"><strong><Amount value={total} currency={currency} compact /></strong><span>100%</span></div></div><div className="category-legend">{chartData.map((record, index) => <div className="category-legend-row" key={record.name}><span className="colour-dot" style={{ background: palette[index % palette.length] }} /><span>{record.name}</span><strong><Amount value={record.value} currency={currency} /></strong></div>)}</div></div>
}

export function WellnessChart({ data, metric, goal }: { data: { date: string; water: number; sleep: number | null; habits: number }[]; metric: 'water' | 'sleep' | 'habits'; goal: number }) {
  const { t, locale } = useI18n()
  const reducedMotion = useReducedMotion()
  const label = t(metric === 'water' ? 'wellness.waterChart' : metric === 'sleep' ? 'wellness.sleepChart' : 'wellness.habitChart')
  return <div className="chart-container" data-testid="wellness-chart"><ResponsiveContainer width="100%" height={250}><LineChart data={data} margin={{ top: 20, left: 0, right: 12, bottom: 0 }}>
    <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 4" /><XAxis dataKey="date" minTickGap={30} axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} dy={8} tickFormatter={value => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(localDate(String(value)))} />
    <YAxis axisLine={false} tickLine={false} width={45} tick={{ fill: 'var(--muted)', fontSize: 10 }} domain={metric === 'habits' ? [0, 100] : metric === 'sleep' ? [0, 24] : [0, 'auto']} />
    <Tooltip contentStyle={tooltipStyle} labelFormatter={value => displayDate(String(value), 'friendly', locale)} formatter={value => [`${Number(value ?? 0)}${metric === 'water' ? ' ml' : metric === 'habits' ? '%' : ' h'}`, label]} />
    {metric === 'water' && <ReferenceLine y={goal} stroke="var(--emerald)" strokeDasharray="5 5" />}
    <Line dataKey={metric} name={label} type="monotone" stroke={metric === 'water' ? '#6366f1' : metric === 'sleep' ? 'var(--violet)' : 'var(--emerald)'} strokeWidth={3} dot={data.length <= 7 ? { r: 4, strokeWidth: 2, fill: 'var(--surface)' } : false} activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={!reducedMotion} animationDuration={650} />
  </LineChart></ResponsiveContainer></div>
}
