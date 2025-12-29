'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <main
      className="
        flex min-h-screen flex-col items-center px-6
        justify-start
        pt-20
        md:pt-50
        lg:justify-center lg:pt-0
      "
    >
      <div className="text-center space-y-4 max-w-xl">
        {/* Headline */}
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
          Your Central Hub for Issue Tracking
        </h1>

        {/* Subheading */}
        <p className="text-muted-foreground md:text-2xl text-lg">
          Log issues, assign tasks, and monitor progress — all from one clean,
          production-ready dashboard built for modern teams.
        </p>

        {/* CTA Buttons */}
        <div className="flex gap-4 justify-center pt-4">
          <Button asChild size="lg">
            <Link href="/login">Get Started</Link>
          </Button>

          <Button asChild size="lg" variant="outline">
            <Link href="/register">Create Account</Link>
          </Button>
        </div>

        {/* Micro trust / helper text */}
        <p className="text-sm text-muted-foreground pt-2">
          Simple setup. Secure access. Built for speed.
        </p>
      </div>
    </main>
  );
}
