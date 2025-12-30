import { LoginForm } from '@/components/features/auth/login-form';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto flex min-h-screen items-start justify-center px-4 py-8 md:py-40 lg:items-center lg:py-0">
        <LoginForm />
      </div>
    </div>
  );
}
