import { useEffect } from 'react';
import { useRouter } from 'next/router';

/**
 * `/` only ever renders for a signed-in user: _app shows <Auth /> itself while
 * there is no session. This page used to render <Auth /> too, so opening the
 * bare URL while signed in showed the sign-in form inside the app shell.
 */
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return null;
}
