export const config = {
  matcher: '/reports/im-dashboard',
};

export default function middleware(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const expected = process.env.REPORT_TOKEN;

  if (!expected) {
    return new Response('Server misconfiguration', { status: 500 });
  }

  if (!token || token !== expected) {
    return new Response('Forbidden', { status: 403 });
  }
}
