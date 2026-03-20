import type { MiddlewareHandler } from "astro";
import { clerkMiddleware, createRouteMatcher } from "@clerk/astro/server";

const isProtectedRoute = createRouteMatcher(["/admin(.*)", "/api/admin(.*)"]);

const handleProtectedRequest = clerkMiddleware((auth, context) => {
  const { isAuthenticated, redirectToSignIn } = auth();

  if (!isAuthenticated) {
    return redirectToSignIn({ returnBackUrl: context.request.url });
  }
});

export const onRequest: MiddlewareHandler = (context, next) => {
  if (!isProtectedRoute(context.request)) {
    return next();
  }

  return handleProtectedRequest(context, next);
};
