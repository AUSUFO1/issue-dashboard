'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Search, Filter, X } from 'lucide-react';
import {
  ISSUE_STATUS,
  ISSUE_PRIORITY,
  ISSUE_TYPE,
  STATUS_COLORS,
  PRIORITY_COLORS,
  TYPE_COLORS,
} from '@/lib/constants';
import { IssueListItem, PaginatedResponse } from '@/types';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function IssuesPage() {
  const router = useRouter();
  const [issues, setIssues] = useState<IssueListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    fetchIssues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, statusFilter, priorityFilter, typeFilter]);

  const fetchIssues = async () => {
    try {
      setLoading(true);

      // Build query params
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/issues?${params}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch issues');
      }

      const data: PaginatedResponse<IssueListItem> = await response.json();
      setIssues(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Fetch issues error:', error);
      toast.error('Failed to load issues');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchIssues();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setTypeFilter('all');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  useEffect(() => {
    if (
      statusFilter === 'all' &&
      priorityFilter === 'all' &&
      typeFilter === 'all' &&
      !searchTerm
    ) {
      fetchIssues();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, priorityFilter, typeFilter, searchTerm]);

  const hasActiveFilters =
    statusFilter !== 'all' ||
    priorityFilter !== 'all' ||
    typeFilter !== 'all' ||
    searchTerm;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Issues</h1>
          <p className="text-muted-foreground">
            Manage and track all issues in your project
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/issues/new')}>
          <Plus className="mr-2 h-4 w-4" />
          New Issue
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters</span>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-1 h-3 w-3" />
              Clear
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {/* Search */}
          <div className="flex gap-2">
            <Input
              placeholder="Search issues..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button size="icon" onClick={handleSearch}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.values(ISSUE_STATUS).map((status) => (
                <SelectItem key={status} value={status}>
                  {status.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Priority Filter */}
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              {Object.values(ISSUE_PRIORITY).map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {priority}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Type Filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.values(ISSUE_TYPE).map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Issues Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Reporter</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // Loading skeletons
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-62.5" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                </TableRow>
              ))
            ) : issues.length === 0 ? (
              // Empty state
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p className="text-muted-foreground">No issues found</p>
                    {hasActiveFilters ? (
                      <Button variant="link" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    ) : (
                      <Button
                        onClick={() => router.push('/dashboard/issues/new')}
                      >
                        Create your first issue
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              // Issue rows
              issues.map((issue) => (
                <TableRow
                  key={issue.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/dashboard/issues/${issue.id}`)}
                >
                  <TableCell className="font-medium">
                    <div className="flex flex-col gap-1">
                      <span>{issue.title}</span>
                      {issue.tags.length > 0 && (
                        <div className="flex gap-1">
                          {issue.tags.slice(0, 2).map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                          {issue.tags.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{issue.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[issue.status]}>
                      {issue.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={PRIORITY_COLORS[issue.priority]}>
                      {issue.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={TYPE_COLORS[issue.type]}
                    >
                      {issue.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {issue.assignedTo ? (
                      <span className="text-sm">
                        {issue.assignedTo.firstName} {issue.assignedTo.lastName}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Unassigned
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {issue.reportedBy.firstName} {issue.reportedBy.lastName}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(issue.createdAt), 'MMM d, yyyy')}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!loading && issues.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} issues
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={!pagination.hasPrevPage}
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
              }
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={!pagination.hasNextPage}
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
              }
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
