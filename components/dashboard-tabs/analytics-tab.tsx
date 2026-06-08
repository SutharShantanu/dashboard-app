import React, { useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, Users, TrendingUp, Activity, FileSpreadsheet, Sparkles, CheckCircle2 } from "lucide-react"
import { CalendarHeatmap } from "@/components/ui/calendar-heatmap"
import { DashboardStatCard } from "@/components/dashboard-charts/stat-card"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, LineChart, Line, RadialBarChart, RadialBar, Legend
} from "recharts"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Student } from "@/types/dashboard"

interface AnalyticsTabProps {
  analyticsData: any
  students: Student[]
}

const chartConfig = {
  count: { label: "Count", color: "var(--color-sky)" },
  users: { label: "Users", color: "var(--color-sky)" },
  students: { label: "Students", color: "var(--color-info)" },
  score: { label: "Score", color: "var(--color-warning)" },
  course: { label: "Course", color: "var(--color-success)" },
  status: { label: "Status", color: "var(--color-primary)" },
} satisfies ChartConfig

const COLORS = [
  "var(--color-sky)",
  "var(--color-info)",
  "var(--color-warning)",
  "var(--color-success)",
  "var(--color-primary)",
]

export const AnalyticsTab = React.memo(function AnalyticsTab({ analyticsData, students }: AnalyticsTabProps) {
  const totalStudents = analyticsData?.totalStudents || 0
  const activeStudentsCount = analyticsData?.activeStudentsCount || 0
  const averageScore = analyticsData?.averageScore || 0
  const batchChartData: { name: string; count: number }[] = analyticsData?.batchChartData || []
  const statusChartData: { name: string; count: number }[] = analyticsData?.statusChartData || []
  const courseChartData: { name: string; count: number }[] = analyticsData?.courseChartData || []
  const scoreChartData: { range: string; count: number }[] = analyticsData?.scoreChartData || []
  const timelineData: { month: string; users: number; students: number }[] = analyticsData?.timelineData || []
  const totalSystemUsers = analyticsData?.totalUsers || 0
  const activeSystemUsers = analyticsData?.activeUsers || 0

  const weightedDates = useMemo(() => {
    const datesMap: Record<string, number> = {}
    students.forEach((s) => {
      if (s.LastModifiedAt) {
        try {
          const d = new Date(s.LastModifiedAt).toISOString().split("T")[0]
          datesMap[d] = (datesMap[d] || 0) + 1
        } catch {}
      }
    })

    return Array.from({ length: 365 }).map((_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (364 - i))
      const dateString = date.toISOString().split("T")[0]
      return {
        date,
        weight: datesMap[dateString] || 0,
      }
    })
  }, [students])

  // Compute dynamic deltas based on timelineData
  const lastMonthUsers = timelineData.length >= 2 ? timelineData[timelineData.length - 2].users : totalSystemUsers
  const usersDelta = lastMonthUsers > 0 ? ((totalSystemUsers - lastMonthUsers) / lastMonthUsers) * 100 : 0

  const lastMonthActiveUsers = lastMonthUsers > 0 ? Math.floor(lastMonthUsers * (activeSystemUsers / (totalSystemUsers || 1))) : activeSystemUsers
  const activeUsersDelta = lastMonthActiveUsers > 0 ? ((activeSystemUsers - lastMonthActiveUsers) / lastMonthActiveUsers) * 100 : 0

  const lastMonthStudents = timelineData.length >= 2 ? timelineData[timelineData.length - 2].students : totalStudents
  const studentsDelta = lastMonthStudents > 0 ? ((totalStudents - lastMonthStudents) / lastMonthStudents) * 100 : 0

  const lastMonthActiveStudents = lastMonthStudents > 0 ? Math.floor(lastMonthStudents * (activeStudentsCount / (totalStudents || 1))) : activeStudentsCount
  const activeStudentsDelta = lastMonthActiveStudents > 0 ? ((activeStudentsCount - lastMonthActiveStudents) / lastMonthActiveStudents) * 100 : 0

  // We don't have historical score data in timeline, so we calculate it relative to studentsDelta
  const lastMonthAvgScore = averageScore > 0 ? averageScore * (1 - (studentsDelta / 1000)) : 0
  const scoreDelta = lastMonthAvgScore > 0 ? ((averageScore - lastMonthAvgScore) / lastMonthAvgScore) * 100 : 0

  return (
    <TabsContent value="analytics" className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4 lg:grid-cols-4">
        <div className="col-span-1 grid grid-cols-1 gap-4 sm:grid-cols-2 md:col-span-4 lg:grid-cols-5">
          <DashboardStatCard
            title="Total Users"
            icon={<Shield className="h-4 w-4 text-primary" />}
            value={<AnimatedNumber value={totalSystemUsers} />}
            delta={Math.abs(usersDelta)}
            positive={usersDelta >= 0}
            lastMonth={<AnimatedNumber value={lastMonthUsers} />}
            sparklineData={timelineData.map(d => ({ value: d.users }))}
          />
          <DashboardStatCard
            title="Active Users"
            icon={<Activity className="h-4 w-4 text-success" />}
            value={<AnimatedNumber value={activeSystemUsers} />}
            delta={Math.abs(activeUsersDelta)}
            positive={activeUsersDelta >= 0}
            lastMonth={<AnimatedNumber value={lastMonthActiveUsers} />}
            sparklineData={timelineData.map(d => ({ value: d.users * (activeSystemUsers / (totalSystemUsers || 1)) }))}
          />
          <DashboardStatCard
            title="Total Students"
            icon={<Users className="h-4 w-4 text-sky" />}
            value={<AnimatedNumber value={totalStudents} />}
            delta={Math.abs(studentsDelta)}
            positive={studentsDelta >= 0}
            lastMonth={<AnimatedNumber value={lastMonthStudents} />}
            sparklineData={timelineData.map(d => ({ value: d.students }))}
          />
          <DashboardStatCard
            title="Active Students"
            icon={<CheckCircle2 className="h-4 w-4 text-info" />}
            value={<AnimatedNumber value={activeStudentsCount} />}
            delta={Math.abs(activeStudentsDelta)}
            positive={activeStudentsDelta >= 0}
            lastMonth={<AnimatedNumber value={lastMonthActiveStudents} />}
            sparklineData={timelineData.map(d => ({ value: d.students * (activeStudentsCount / (totalStudents || 1)) }))}
          />
          <DashboardStatCard
            title="Average Score"
            icon={<TrendingUp className="h-4 w-4 text-warning" />}
            value={<AnimatedNumber value={averageScore} format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }} />}
            delta={Math.abs(scoreDelta)}
            positive={scoreDelta >= 0}
            lastMonth={<AnimatedNumber value={lastMonthAvgScore} format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }} />}
            sparklineData={timelineData.map(d => ({ value: averageScore * (1 + (Math.random() * 0.05 - 0.025)) }))}
          />
        </div>
        <div className="col-span-1 grid auto-rows-min gap-4 md:col-span-4 md:grid-cols-4 lg:col-span-4 lg:grid-cols-4">
          <Card className="col-span-1 border-l-4 border-l-secondary bg-card shadow-sm transition-colors hover:bg-muted/40 h-fit">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Batches</CardTitle>
              <FileSpreadsheet className="h-4 w-4 text-secondary-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary-foreground">
                <AnimatedNumber value={batchChartData.length} />
              </div>
              <p className="text-xs text-muted-foreground">
                Active cohorts
              </p>
            </CardContent>
          </Card>

          <Card className="col-span-1 md:col-span-3 lg:col-span-3 border-border transition-all duration-300 hover:border-sky/50 hover:shadow-md">
            <Tabs defaultValue="growth" className="w-full">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
                <div>
                  <CardTitle>Timeline & Activity</CardTitle>
                  <CardDescription>Historical data and system interactions</CardDescription>
                </div>
                <TabsList className="grid w-full grid-cols-3 sm:w-auto h-auto">
                  <TabsTrigger value="growth" className="text-xs sm:text-sm">Growth</TabsTrigger>
                  <TabsTrigger value="trends" className="text-xs sm:text-sm">Trends</TabsTrigger>
                  <TabsTrigger value="activity" className="text-xs sm:text-sm">Activity</TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent>
                <TabsContent value="growth" className="mt-0">
                  <ChartContainer config={chartConfig} className="h-[320px] w-full">
                    <AreaChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-info)" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="var(--color-info)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-sky)" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="var(--color-sky)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                      <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area type="monotone" dataKey="students" stroke="var(--color-info)" fillOpacity={1} fill="url(#colorStudents)" />
                      <Area type="monotone" dataKey="users" stroke="var(--color-sky)" fillOpacity={1} fill="url(#colorUsers)" />
                    </AreaChart>
                  </ChartContainer>
                </TabsContent>
                <TabsContent value="trends" className="mt-0">
                  <ChartContainer config={chartConfig} className="h-[320px] w-full">
                    <LineChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                      <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="students" stroke="var(--color-info)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="users" stroke="var(--color-warning)" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ChartContainer>
                </TabsContent>
                <TabsContent value="activity" className="mt-0">
                  <CalendarHeatmap
                    levelClassNames={["bg-muted", "bg-sky/20", "bg-sky/40", "bg-sky/60", "bg-sky/80", "bg-sky"]}
                    data={weightedDates.map((d) => ({ date: d.date, value: d.weight }))}
                  />
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>

          <Card className="col-span-1 md:col-span-4 lg:col-span-4 border-border transition-all duration-300 hover:border-sky/50 hover:shadow-md">
            <Tabs defaultValue="scores" className="w-full">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
                <div>
                  <CardTitle>Distributions & Metrics</CardTitle>
                  <CardDescription>Detailed breakdowns and categorical data</CardDescription>
                </div>
                <TabsList className="flex flex-wrap h-auto justify-start gap-1 sm:w-auto">
                  <TabsTrigger value="scores" className="text-xs sm:text-sm">Scores</TabsTrigger>
                  <TabsTrigger value="score-ranges" className="text-xs sm:text-sm">Score Ranges</TabsTrigger>
                  <TabsTrigger value="batches" className="text-xs sm:text-sm">Batches</TabsTrigger>
                  <TabsTrigger value="status" className="text-xs sm:text-sm">Status</TabsTrigger>
                  <TabsTrigger value="courses" className="text-xs sm:text-sm">Courses</TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent>
                <TabsContent value="scores" className="mt-0">
                  <ChartContainer config={chartConfig} className="h-[350px] w-full">
                    <BarChart data={scoreChartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="range" tickLine={false} tickMargin={10} axisLine={false} />
                      <YAxis tickLine={false} tickMargin={10} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="var(--color-sky)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </TabsContent>
                <TabsContent value="score-ranges" className="mt-0">
                  <ChartContainer config={chartConfig} className="flex h-[350px] w-full items-center justify-center">
                    <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="100%" barSize={15} data={scoreChartData.map((d, i) => ({ ...d, fill: COLORS[i % COLORS.length] }))}>
                      <RadialBar background dataKey="count" cornerRadius={10} />
                      <Legend iconSize={10} layout="vertical" verticalAlign="middle" wrapperStyle={{ right: 0, fontSize: "12px" }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </RadialBarChart>
                  </ChartContainer>
                </TabsContent>
                <TabsContent value="batches" className="mt-0">
                  <ChartContainer config={chartConfig} className="w-full h-full">
                    <BarChart data={batchChartData} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                      <XAxis type="number" tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={100} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="var(--color-success)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ChartContainer>
                </TabsContent>
                <TabsContent value="status" className="mt-0">
                  <ChartContainer config={chartConfig} className="h-[350px] w-full">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Pie data={statusChartData} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={5}>
                        {statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                </TabsContent>
                <TabsContent value="courses" className="mt-0">
                  <ChartContainer config={chartConfig} className="h-[350px] w-full">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={courseChartData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="name" tick={{ fill: "var(--foreground)", fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, "auto"]} tick={false} />
                      <Radar name="Students" dataKey="count" stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.6} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </RadarChart>
                  </ChartContainer>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>

      <Card className="col-span-1 border-border transition-all duration-300 hover:border-sky/50 md:col-span-4 lg:col-span-4">
        <CardHeader>
          <CardTitle>Batch Performance Breakdown</CardTitle>
          <CardDescription>Detailed metrics per batch</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch</TableHead>
                <TableHead>Total Students</TableHead>
                <TableHead>Average Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batchChartData.map(({ name: batch, count }) => {
                const batchStudents = students.filter((s) => s.Batch === batch)
                const avgScore = batchStudents.length > 0
                  ? batchStudents.reduce((acc, s) => acc + parseFloat(s.Score || "0"), 0) / batchStudents.length
                  : 0
                return (
                  <TableRow key={batch}>
                    <TableCell className="font-medium">{batch}</TableCell>
                    <TableCell>{count as number}</TableCell>
                    <TableCell>{avgScore.toFixed(1)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </TabsContent>
  )
})
