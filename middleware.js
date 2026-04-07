import { NextResponse } from 'next/server';

export const config = {
  matcher: '/reports/im-dashboard',
};

export function middleware(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const expected = process.env.REPORT_TOKEN;

  if (!expected) {
    return new NextResponse('Server misconfiguration', { status: 500 });
  }

  if (!token || token !== expected) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  return NextResponse.next();
}
