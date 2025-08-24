import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

interface LoginPageProps { searchParams?: { [key: string]: string | string[] | undefined }; }

export default function LoginPage({ searchParams }: LoginPageProps) {
  let rawNext = searchParams?.next;
  let nextStr: string;
  if (Array.isArray(rawNext)) nextStr = rawNext[0] || '/admin/dashboard'; else if (typeof rawNext === 'string') nextStr = rawNext; else nextStr = '/admin/dashboard';
  const unauthorized = !!(searchParams && (Array.isArray(searchParams.unauthorized) ? searchParams.unauthorized[0] : searchParams.unauthorized));
  return <LoginForm next={nextStr} unauthorized={unauthorized} />;
}
