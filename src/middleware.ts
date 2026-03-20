import { clerkMiddleware, createRouteMatcher } from "@clerk/astro/server";

const isProtectedRoute = createRouteMatcher(["/admin(.*)", "/api/admin(.*)"]);

export const onRequest = clerkMiddleware((auth, context) => {
  const { isAuthenticated, redirectToSignIn } = auth();

  if (isProtectedRoute(context.request) && !isAuthenticated) {
    return redirectToSignIn({ returnBackUrl: context.request.url });
  }
});
