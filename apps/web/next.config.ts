import { withSentryConfig } from '@sentry/nextjs';
import { NextConfig } from 'next';

export default withSentryConfig<NextConfig>(
  {
    experimental: {
      webpackMemoryOptimizations: true,
    },
    /**
     * `/rank-calculator` became `/player`, and the moderator submission view
     * moved out from under it to `/submissions`.
     *
     * These are permanent because the old URLs are not ours to expire: a
     * submission link is embedded in a Discord thread forever, and the
     * "Apply for rank" button in every auto-rank DM ever sent points at
     * `/rank-calculator/<rsn>`. A 404 on a two-year-old approval link is a
     * real regression, so the old paths keep resolving rather than dying with
     * the rename.
     *
     * Order matters: `/rank-calculator/view/:id` and the two `players/*`
     * paths must be matched before the catch-all, which would otherwise
     * swallow them into `/player/view/:id`.
     */
    redirects: () =>
      Promise.resolve([
        {
          source: '/rank-calculator/view/:submissionId',
          destination: '/submissions/:submissionId',
          permanent: true,
        },
        {
          source: '/rank-calculator/players/add',
          destination: '/join',
          permanent: true,
        },
        {
          source: '/rank-calculator/players/edit/:player',
          destination: '/player/:player/edit',
          permanent: true,
        },
        {
          source: '/rank-calculator/:path*',
          destination: '/player/:path*',
          permanent: true,
        },
      ]),
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'placehold.co',
          port: '',
          pathname: '**',
        },
        {
          protocol: 'https',
          hostname: 'oldschool.runescape.wiki',
          port: '',
          pathname: '/images/**',
        },
      ],
    },
  },
  {
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options

    org: 'grotto',
    project: 'javascript-nextjs',

    // Only print logs for uploading source maps in CI
    silent: !process.env.CI,

    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Automatically annotate React components to show their full name in breadcrumbs and session replay
    reactComponentAnnotation: {
      enabled: true,
    },

    // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
    // This can increase your server load as well as your hosting bill.
    // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
    // side errors will fail.
    // tunnelRoute: "/monitoring",

    // Hides source maps from generated client bundles
    sourcemaps: {
      disable: true,
    },

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,

    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,
  },
);
