'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Edit,
  MessageSquare,
  Clock,
  User,
  Calendar,
} from 'lucide-react';
import {
  ISSUE_STATUS,
  ROLES,
  STATUS_COLORS,
  PRIORITY_COLORS,
  TYPE_COLORS,
  IssueStatus,
} from '@/lib/constants';
import { Issue, Comment } from '@/types';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function IssueDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();

  // FIX: Handle params properly - it might be a Promise in Next.js 15
  const [issueId, setIssueId] = useState<string | null>(null);

  const [issue, setIssue] = useState<Issue | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // FIX: Extract issueId from params
  useEffect(() => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (id) {
      setIssueId(id);
    }
  }, [params.id]);

  useEffect(() => {
    if (issueId) {
      fetchIssue();
      fetchComments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueId]);

  const fetchIssue = async () => {
    if (!issueId) return;

    try {
      const response = await fetch(`/api/issues/${issueId}`, {
        credentials: 'include', // ✅ Include auth cookie
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch issue');
      }

      setIssue(data.data);
    } catch (error) {
      console.error('Fetch issue error:', error);
      toast.error('Failed to load issue');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    if (!issueId) return;

    try {
      const response = await fetch(`/api/issues/${issueId}/comments`, {
        credentials: 'include', // ✅ Include auth cookie
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch comments');
      }

      setComments(data.data);
    } catch (error) {
      console.error('Fetch comments error:', error);
    }
  };

  const handleStatusChange = async (newStatus: IssueStatus) => {
    if (!issueId) return;

    try {
      setIsUpdatingStatus(true);
      const response = await fetch(`/api/issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // ✅ Include auth cookie
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      const data = await response.json();
      setIssue(data.data);
      toast.success('Status updated successfully');
    } catch (error) {
      console.error('Update status error:', error);
      toast.error('Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddComment = async () => {
    if (!issueId || !commentText.trim()) return;

    try {
      setIsSubmittingComment(true);
      const response = await fetch(`/api/issues/${issueId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // ✅ Include auth cookie
        body: JSON.stringify({ text: commentText }),
      });

      if (!response.ok) throw new Error('Failed to add comment');

      const data = await response.json();
      setComments([data.data, ...comments]);
      setCommentText('');
      toast.success('Comment added successfully');
    } catch (error) {
      console.error('Add comment error:', error);
      toast.error('Failed to add comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName || !lastName) return 'U';
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  // Show loading while extracting issueId
  if (!issueId || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="flex flex-col items-center justify-center h-100 gap-4">
        <p className="text-muted-foreground">Issue not found</p>
        <Button onClick={() => router.push('/dashboard/issues')}>
          Back to Issues
        </Button>
      </div>
    );
  }

  const reportedBy =
    typeof issue.reportedBy === 'object' ? issue.reportedBy : null;
  const assignedTo =
    typeof issue.assignedTo === 'object' ? issue.assignedTo : null;
  const canEdit = user?.role === ROLES.ADMIN || user?.role === ROLES.MANAGER;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{issue.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge className={STATUS_COLORS[issue.status]}>
              {issue.status.replace('_', ' ')}
            </Badge>
            <Badge className={PRIORITY_COLORS[issue.priority]}>
              {issue.priority}
            </Badge>
            <Badge variant="outline" className={TYPE_COLORS[issue.type]}>
              {issue.type}
            </Badge>
          </div>
        </div>
        {canEdit && (
          <Button variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{issue.description}</p>
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Comments ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Comment */}
              <div className="space-y-2">
                <textarea
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleAddComment}
                    disabled={!commentText.trim() || isSubmittingComment}
                  >
                    Add Comment
                  </Button>
                </div>
              </div>

              {/* Comment List */}
              <div className="space-y-4 border-t pt-4">
                {comments.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    No comments yet. Be the first to comment!
                  </p>
                ) : (
                  comments.map((comment) => {
                    const commentUser =
                      typeof comment.userId === 'object'
                        ? comment.userId
                        : null;
                    return (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {getInitials(
                              commentUser?.firstName,
                              commentUser?.lastName
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {commentUser?.firstName} {commentUser?.lastName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(
                                new Date(comment.createdAt),
                                'MMM d, yyyy h:mm a'
                              )}
                            </span>
                            {comment.isEdited && (
                              <span className="text-xs text-muted-foreground">
                                (edited)
                              </span>
                            )}
                          </div>
                          <p className="text-sm whitespace-pre-wrap">
                            {comment.text}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Update */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={issue.status}
                onValueChange={(value) =>
                  handleStatusChange(value as IssueStatus)
                }
                disabled={isUpdatingStatus}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ISSUE_STATUS).map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Assignee</p>
                  <p className="font-medium">
                    {assignedTo
                      ? `${assignedTo.firstName} ${assignedTo.lastName}`
                      : 'Unassigned'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Reporter</p>
                  <p className="font-medium">
                    {reportedBy &&
                      `${reportedBy.firstName} ${reportedBy.lastName}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="font-medium">
                    {format(new Date(issue.createdAt), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>

              {issue.resolvedAt && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Resolved</p>
                    <p className="font-medium">
                      {format(new Date(issue.resolvedAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          {issue.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {issue.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
