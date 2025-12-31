'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { ISSUE_TYPE, ISSUE_PRIORITY } from '@/lib/constants';
import { toast } from 'sonner';

const createIssueSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000),
  type: z.enum(['BUG', 'FEATURE', 'TASK', 'INCIDENT']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  tags: z.string().optional(),
});

type CreateIssueForm = z.infer<typeof createIssueSchema>;

export default function CreateIssuePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateIssueForm>({
    resolver: zodResolver(createIssueSchema),
    defaultValues: {
      priority: 'MEDIUM',
    },
  });

  const selectedType = watch('type');
  const selectedPriority = watch('priority');

  const onSubmit = async (data: CreateIssueForm) => {
    try {
      setIsSubmitting(true);

      // Parse tags
      const tags = data.tags
        ? data.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [];

      const response = await fetch('/api/issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          tags,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to create issue');
      }

      const result = await response.json();
      toast.success('Issue created successfully');
      router.push(`/dashboard/issues/${result.data.id}`);
    } catch (error: any) {
      console.error('Create issue error:', error);
      toast.error(error.message || 'Failed to create issue');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create New Issue</h1>
          <p className="text-muted-foreground">
            Fill in the details to create a new issue
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Issue Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g., Login page returns 500 error"
                {...register('title')}
              />
              {errors.title && (
                <p className="text-sm text-destructive">
                  {errors.title.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-destructive">*</span>
              </Label>
              <textarea
                id="description"
                rows={6}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Provide detailed information about the issue..."
                {...register('description')}
              />
              {errors.description && (
                <p className="text-sm text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Type */}
              <div className="space-y-2">
                <Label htmlFor="type">
                  Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={selectedType}
                  onValueChange={(value) =>
                    setValue('type', value as CreateIssueForm['type'])
                  }
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(ISSUE_TYPE).map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.type && (
                  <p className="text-sm text-destructive">
                    {errors.type.message}
                  </p>
                )}
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label htmlFor="priority">
                  Priority <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={selectedPriority}
                  onValueChange={(value) =>
                    setValue('priority', value as CreateIssueForm['priority'])
                  }
                >
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(ISSUE_PRIORITY).map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {priority}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.priority && (
                  <p className="text-sm text-destructive">
                    {errors.priority.message}
                  </p>
                )}
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (optional)</Label>
              <Input
                id="tags"
                placeholder="e.g., authentication, urgent, frontend (comma-separated)"
                {...register('tags')}
              />
              <p className="text-sm text-muted-foreground">
                Separate multiple tags with commas (max 10 tags)
              </p>
              {errors.tags && (
                <p className="text-sm text-destructive">
                  {errors.tags.message}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Issue
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
