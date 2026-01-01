'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  FileText,
  Activity,
  AlertCircle,
  Clock,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { DashboardStats, AuditAction } from '@/types';
import { format } from 'date-fns';
import { toast } from 'sonner';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#6b7280'];

export default function DashboardPage() {
  const { user, isLoading, accessToken } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoading) return;
    if (!accessToken) return;

    loadStats();
  }, [isLoading, accessToken]);

  const loadStats = async () => {
    if (!accessToken) return;

    try {
      setLoading(true);

      const res = await fetch('/api/stats', {
        headers: {
          Authorization: `Bearer ${accessToken}`, // ✅ send token
        },
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Unauthorized');
      }

      const json = await res.json();
      setStats(json.data);
    } catch (err) {
      console.error('Dashboard stats error:', err);
      toast.error('Failed to load dashboard statistics');
      setStats({
        totalIssues: 0,
        openIssues: 0,
        inProgressIssues: 0,
        resolvedIssues: 0,
        closedIssues: 0,
        myAssignedIssues: 0,
        myReportedIssues: 0,
        criticalIssues: 0,
        highPriorityIssues: 0,
        averageResolutionTime: 0,
        issuesByStatus: {
          OPEN: 0,
          IN_PROGRESS: 0,
          RESOLVED: 0,
          CLOSED: 0,
        },
        issuesByPriority: {
          LOW: 0,
          MEDIUM: 0,
          HIGH: 0,
          CRITICAL: 0,
        },
        issuesByType: {
          BUG: 0,
          FEATURE: 0,
          TASK: 0,
          INCIDENT: 0,
        },
        recentActivity: [],
      });
    } finally {
      setLoading(false);
    }
  };

  /* LOADING STATES */
  if (isLoading || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-1/2" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!stats) return null;

  /* DATA TRANSFORMS */
  const statusData = Object.entries(stats.issuesByStatus).map(
    ([key, value]) => ({
      name: key.replace('_', ' '),
      value,
    })
  );

  const priorityData = Object.entries(stats.issuesByPriority).map(
    ([key, value]) => ({
      name: key,
      value,
    })
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight lg:text-3xl">
          Welcome back, {user?.firstName}!
        </h2>
        <p className="text-sm text-muted-foreground lg:text-base">
          Here's what's happening with your issues today.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          title="Total Issues"
          value={stats.totalIssues}
          icon={<FileText />}
        />
        <Metric
          title="My Assigned"
          value={stats.myAssignedIssues}
          icon={<Activity />}
        />
        <Metric
          title="Critical"
          value={stats.criticalIssues}
          icon={<AlertCircle />}
          danger
        />
        <Metric
          title="Avg Resolution"
          value={`${stats.averageResolutionTime}h`}
          icon={<Clock />}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Issues by Status</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {stats.totalIssues === 0 ? (
              <p className="text-center text-muted-foreground py-24">
                No issues yet
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" outerRadius={80}>
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Issues by Priority</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {stats.totalIssues === 0 ? (
              <p className="text-center text-muted-foreground py-24">
                No issues yet
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Recent Activity</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/issues')}
          >
            View all
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {stats.recentActivity.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No recent activity
            </p>
          )}

          {stats.recentActivity.slice(0, 5).map((a) => {
            const userObj = typeof a.userId === 'object' ? a.userId : null;
            const issueObj = typeof a.issueId === 'object' ? a.issueId : null;

            return (
              <div
                key={a.id}
                className="flex gap-3 border-b pb-3 last:border-0"
              >
                <div className="rounded-full bg-primary/10 p-2">
                  {a.action === AuditAction.CREATED && (
                    <FileText className="h-4 w-4" />
                  )}
                  {a.action === AuditAction.STATUS_CHANGED &&
                    a.newValue === 'RESOLVED' && (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                  {a.action === AuditAction.STATUS_CHANGED &&
                    a.newValue !== 'RESOLVED' && (
                      <TrendingUp className="h-4 w-4" />
                    )}
                  {![AuditAction.CREATED, AuditAction.STATUS_CHANGED].includes(
                    a.action
                  ) && <Activity className="h-4 w-4" />}
                </div>

                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-medium">
                      {userObj?.firstName} {userObj?.lastName}
                    </span>{' '}
                    {a.action.toLowerCase().replace('_', ' ')}
                  </p>

                  {issueObj && (
                    <p className="text-sm text-muted-foreground">
                      {issueObj.title}
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground">
                    {format(new Date(a.createdAt), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

/* Metric Card */
function Metric({
  title,
  value,
  icon,
  danger,
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={danger ? 'text-destructive' : 'text-muted-foreground'}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div
          className={`text-2xl font-bold ${danger ? 'text-destructive' : ''}`}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
