'use client'

import { Activity, ArrowRight, Files, Flower, GalleryVerticalEnd, MapPin } from 'lucide-react'
import DottedMap from 'dotted-map'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Card } from '@/components/ui/card'
import * as React from "react"
import * as RechartsPrimitive from "recharts"
import { cn } from "@/lib/utils"

export default function CombinedFeaturedSection() {
  const featuredCasestudy = {
    company: 'BazaarX Seller',
    tags: 'Success Story',
    title: 'How sellers scaled to 10K+ orders',
    subtitle: 'using real-time analytics, automated inventory management, and AI-powered insights to grow their Philippine business nationwide',
  }

  return (
    <section className="py-16 sm:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 md:grid-rows-2">

        {/* 1. MAP - Top Left */}
        <div className="relative rounded-none overflow-hidden bg-muted border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <MapPin className="w-4 h-4" />
            BazaarX Nationwide Reach
          </div>
          <h3 className="text-xl font-normal text-gray-900 dark:text-white">
            Track orders across all Philippine regions.{" "}
            <span className="text-gray-500 dark:text-gray-400">From Luzon to Mindanao, monitor every sale in real-time.</span>
          </h3>

          <div className="relative mt-4">
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 px-3 py-1 bg-white dark:bg-black text-black dark:text-white rounded-md text-xs font-medium shadow flex items-center gap-2">
              🇵🇭 Latest order from Cebu City
            </div>
            <Map />
          </div>
        </div>

        {/* 2. FEATURED CASE STUDY BLOCK - Top Right */}
        <div className="flex flex-col justify-between gap-4 p-6 rounded-none border border-gray-200 dark:border-gray-800 bg-card">
          <div>
            <span className="text-xs flex items-center gap-2 text-sm text-gray-500">
              <GalleryVerticalEnd className="w-4 h-4" /> {featuredCasestudy.tags}
            </span>
            <h3 className="text-xl font-normal text-gray-900 dark:text-white">
              {featuredCasestudy.title}{" "}
              <span className="text-gray-500 dark:text-gray-400">{featuredCasestudy.subtitle}</span>
            </h3>
          </div>
          <div className="flex justify-center items-center w-full">
            <BazaarXFeaturedMessageCard />
          </div>
        </div>

        {/* 3. CHART - Bottom Left */}
        <div className="rounded-none border border-gray-200 dark:border-gray-800 bg-muted p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <Activity className="w-4 h-4" />
            BazaarX Analytics
          </div>
          <h3 className="text-xl font-normal text-gray-900 dark:text-white">
            Real-time sales performance tracking.{" "}
            <span className="text-gray-500 dark:text-gray-400">Monitor revenue, orders, and customer activity instantly.</span>
          </h3>
          <MonitoringChart />
        </div>

        {/* 4. ALL FEATURE CARDS - Bottom Right */}
        <div className="grid sm:grid-cols-2 rounded-none bg-card">
          <FeatureCard
            icon={<Files className="w-4 h-4" />}
            title="One-Click Setup"
            subtitle="Start Selling Today"
            description="Launch your store in minutes with pre-built templates and automated tools."
          />
          <FeatureCard
            icon={<Flower className="w-4 h-4" />}
            title="Powerful Yet Simple"
            subtitle="Easy to Master"
            description="Intuitive dashboard designed for Filipino entrepreneurs with zero learning curve."
          />
        </div>
      </div>
    </section>
  )
}

// ----------------- Feature Card Component -------------------
function FeatureCard({ icon, title, subtitle, description }: { icon: React.ReactNode, title: string, subtitle: string, description: string }) {
  return (
    <div className="relative flex flex-col gap-3 p-4 border border-gray-200 dark:border-gray-800 bg-background transition">
      <div className="flex items-center gap-4">
        <div>
          <span className="text-xs flex items-center gap-2 text-sm text-gray-500 mb-4">
            {icon}
            {title}
          </span>
          <h3 className="text-lg font-normal text-gray-900 dark:text-white">
            {subtitle}{" "}
            <span className="text-gray-500 dark:text-gray-400">{description}</span>
          </h3>
        </div>
      </div>

      {/* Card pinned to bottom right */}
      <Card className="absolute bottom-0 right-0 w-24 h-20 sm:w-32 sm:h-28 md:w-40 md:h-32 border-8 border-r-0 border-b-0 rounded-tl-xl rounded-br-none rounded-tr-none rounded-bl-none overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100">
      </Card>

      {/* Arrow icon on top of Card */}
      <div className="absolute bottom-2 right-2 p-3 flex items-center gap-2 border border-gray-200 dark:border-gray-800 rounded-full hover:-rotate-45 transition z-10 bg-background">
        <ArrowRight className="w-4 h-4 text-orange-600" />
      </div>
    </div>
  )
}

// ----------------- Map -------------------
const map = new DottedMap({ height: 55, grid: 'diagonal' })
const points = map.getPoints()

const Map = () => (
  <svg viewBox="0 0 120 60" className="w-full h-auto text-orange-600/70 dark:text-orange-400/30">
    {points.map((point, i) => (
      <circle key={i} cx={point.x} cy={point.y} r={0.15} fill="currentColor" />
    ))}
  </svg>
)

// ----------------- Chart -------------------
const chartData = [
  { month: 'May', sellers: 156, orders: 1224 },
  { month: 'June', sellers: 290, orders: 2300 },
  { month: 'July', sellers: 426, orders: 3252 },
  { month: 'Aug', sellers: 605, orders: 5410 },
  { month: 'Sep', sellers: 800, orders: 7126 },
  { month: 'Oct', sellers: 1200, orders: 10800 },
]

const chartConfig = {
  sellers: {
    label: 'Active Sellers',
    color: '#FF6A00', // BazaarX Orange
  },
  orders: {
    label: 'Monthly Orders',
    color: '#FFA500', // Lighter Orange
  },
} satisfies ChartConfig

function MonitoringChart() {
  return (
    <ChartContainer className="h-60 aspect-auto" config={chartConfig}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="fillSellers" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-sellers)" stopOpacity={0.8} />
            <stop offset="55%" stopColor="var(--color-sellers)" stopOpacity={0.1} />
          </linearGradient>
          <linearGradient id="fillOrders" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-orders)" stopOpacity={0.8} />
            <stop offset="55%" stopColor="var(--color-orders)" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <XAxis hide />
        <YAxis hide />
        <CartesianGrid vertical={false} horizontal={false} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent className="dark:bg-muted" />} />
        <Area strokeWidth={2} dataKey="orders" type="monotone" fill="url(#fillOrders)" stroke="var(--color-orders)" />
        <Area strokeWidth={2} dataKey="sellers" type="monotone" fill="url(#fillSellers)" stroke="var(--color-sellers)" />
      </AreaChart>
    </ChartContainer>
  )
}

interface Message {
  title: string;
  time: string;
  content: string;
  color: string;
}

const messages: Message[] = [
  {
    title: "New Order Alert",
    time: "1m ago",
    content: "3 new orders from Metro Manila - ₱12,450 total",
    color: "from-orange-400 to-red-500",
  },
  {
    title: "Customer Review",
    time: "3m ago",
    content: "5-star review: 'Amazing quality, fast shipping!'",
    color: "from-yellow-400 to-orange-500",
  },
  {
    title: "Inventory Update",
    time: "6m ago",
    content: "Low stock alert: Wireless Earbuds (5 units left)",
    color: "from-blue-400 to-indigo-500",
  },
  {
    title: "Sales Milestone",
    time: "10m ago",
    content: "Congratulations! You've reached ₱100K in sales",
    color: "from-green-400 to-emerald-600",
  },
  {
    title: "Product Analytics",
    time: "12m ago",
    content: "Your 'Filipino Woven Bag' is trending in Cebu",
    color: "from-purple-400 to-pink-500",
  },
  {
    title: "Weekly Summary",
    time: "15m ago",
    content: "127 orders fulfilled this week. Great job! 🎉",
    color: "from-pink-400 to-rose-500",
  },
];

const BazaarXFeaturedMessageCard = () => {
  return (
    <div className="w-full max-w-sm h-[280px] bg-white dark:bg-gray-900 p-2 overflow-hidden font-sans relative">
      {/* Fade shadow overlay */}
      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white dark:from-gray-900 to-transparent z-10"></div>

      <div className="space-y-2 relative z-0">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 items-start p-3 border border-gray-200 dark:border-gray-700 rounded-lg transform transition duration-300 ease-in-out cursor-pointer animate-scaleUp`}
            style={{
              animationDelay: `${i * 300}ms`,
              animationFillMode: "forwards",
              opacity: 0,
            }}
          >
            <div
              className={`w-8 h-8 min-w-[2rem] min-h-[2rem] rounded-lg bg-gradient-to-br ${msg.color}`}
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-800 dark:text-white">
                {msg.title}
                <span className="text-xs text-gray-500 before:content-['•'] before:mr-1">
                  {msg.time}
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 line-clamp-1">
                {msg.content}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Chart Infrastructure
const THEMES = { light: "", dark: ".dark" } as const

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
}

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }

  return context
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig
    children: React.ComponentProps<
      typeof RechartsPrimitive.ResponsiveContainer
    >["children"]
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = "Chart"

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([, itemConfig]) => itemConfig.theme || itemConfig.color,
  )

  if (!colorConfig.length) {
    return null
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
                .map(([key, itemConfig]) => {
                  const color =
                    itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
                    itemConfig.color
                  return color ? `  --color-${key}: ${color};` : null
                })
                .join("\n")}
}
`,
          )
          .join("\n"),
      }}
    />
  )
}

const ChartTooltip = RechartsPrimitive.Tooltip as React.FC<RechartsPrimitive.TooltipProps<number | string, string>>

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  {
    active?: boolean
    payload?: Array<Record<string, unknown>>
    label?: React.ReactNode
    labelFormatter?: (label: unknown, payload: Array<Record<string, unknown>>) => React.ReactNode
    labelClassName?: string
    formatter?: (value: unknown, name: unknown, item: Record<string, unknown>, index: number, payload: unknown) => React.ReactNode
    color?: string
    hideLabel?: boolean
    hideIndicator?: boolean
    indicator?: "line" | "dot" | "dashed"
    nameKey?: string
    labelKey?: string
  } & React.ComponentProps<"div">
>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
    },
    ref,
  ) => {
    const { config } = useChart()

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload?.length) {
        return null
      }

      const [item] = payload
      const key = `${labelKey || item.dataKey || item.name || "value"}`
      const itemConfig = getPayloadConfigFromPayload(config, item, key)
      const value =
        !labelKey && typeof label === "string"
          ? config[label as keyof typeof config]?.label || label
          : itemConfig?.label

      if (labelFormatter) {
        return (
          <div className={cn("font-medium", labelClassName)}>
            {labelFormatter(value, payload)}
          </div>
        )
      }

      if (!value) {
        return null
      }

      return <div className={cn("font-medium", labelClassName)}>{value}</div>
    }, [
      label,
      labelFormatter,
      payload,
      hideLabel,
      labelClassName,
      config,
      labelKey,
    ])

    if (!active || !payload?.length) {
      return null
    }

    const nestLabel = payload.length === 1 && indicator !== "dot"

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
          className,
        )}
      >
        {!nestLabel ? tooltipLabel : null}
        <div className="grid gap-1.5">
          {payload.map((item, index) => {
            const itemData = item as { name?: string; dataKey?: string; value?: number | string; color?: string; payload?: { fill?: string } }
            const key = `${nameKey || itemData.name || itemData.dataKey || "value"}`
            const itemConfig = getPayloadConfigFromPayload(config, item, key)
            const indicatorColor = color || itemData.payload?.fill || itemData.color

            return (
              <div
                key={itemData.dataKey || index}
                className={cn(
                  "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
                  indicator === "dot" && "items-center",
                )}
              >
                {formatter && itemData?.value !== undefined && itemData.name ? (
                  formatter(itemData.value, itemData.name, item, index, itemData.payload)
                ) : (
                  <>
                    {itemConfig?.icon ? (
                      <itemConfig.icon />
                    ) : (
                      !hideIndicator && (
                        <div
                          className={cn(
                            "shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]",
                            {
                              "h-2.5 w-2.5": indicator === "dot",
                              "w-1": indicator === "line",
                              "w-0 border-[1.5px] border-dashed bg-transparent":
                                indicator === "dashed",
                              "my-0.5": nestLabel && indicator === "dashed",
                            },
                          )}
                          style={
                            {
                              "--color-bg": indicatorColor,
                              "--color-border": indicatorColor,
                            } as React.CSSProperties
                          }
                        />
                      )
                    )}
                    <div
                      className={cn(
                        "flex flex-1 justify-between leading-none",
                        nestLabel ? "items-end" : "items-center",
                      )}
                    >
                      <div className="grid gap-1.5">
                        {nestLabel ? tooltipLabel : null}
                        <span className="text-muted-foreground">
                          {itemConfig?.label || itemData.name}
                        </span>
                      </div>
                      {itemData.value && (
                        <span className="font-mono font-medium tabular-nums text-foreground">
                          {typeof itemData.value === 'number' ? itemData.value.toLocaleString() : String(itemData.value)}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  },
)
ChartTooltipContent.displayName = "ChartTooltip"

function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: unknown,
  key: string,
) {
  if (typeof payload !== "object" || payload === null) {
    return undefined
  }

  const payloadObj = payload as Record<string, unknown>

  const payloadPayload =
    "payload" in payloadObj &&
      typeof payloadObj.payload === "object" &&
      payloadObj.payload !== null
      ? payloadObj.payload as Record<string, unknown>
      : undefined

  let configLabelKey: string = key

  if (
    key in payloadObj &&
    typeof payloadObj[key] === "string"
  ) {
    configLabelKey = payloadObj[key] as string
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key] === "string"
  ) {
    configLabelKey = payloadPayload[key] as string
  }

  return configLabelKey in config
    ? config[configLabelKey]
    : config[key] as unknown as (typeof config)[keyof typeof config] | undefined
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartStyle,
}
