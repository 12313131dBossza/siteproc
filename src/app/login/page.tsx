import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

interface LoginPageProps { searchParams?: Record<string, string | string[] | undefined>; }

export default function LoginPage({ searchParams }: LoginPageProps) {
  const nextParam = (searchParams?.next && Array.isArray(searchParams.next) ? searchParams.next[0] : searchParams?.next) || '/admin/dashboard';
  const unauthorized = !!(searchParams?.unauthorized);
  return <LoginForm next={nextParam} unauthorized={unauthorized} />;
}
