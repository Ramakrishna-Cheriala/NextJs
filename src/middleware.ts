import { NextResponse } from "next/server";
import { authMiddleware, clerkMiddleware } from "@clerk/nextjs/server";

export default authMiddleware({
  publicRoutes: ["/site", "/api/uploadthing"],

  async afterAuth(auth, req) {
    // console.log("clerkmiddleware");
    const url = req.nextUrl;
    // console.log(url);
    const searchParams = url.searchParams.toString();
    const pathWithSearchParams = `${url.pathname}${
      searchParams.length > 0 ? `?${searchParams}` : ""
    }`;

    const hostname = req.headers.get("host");
    console.log("Hostname:", hostname);

    const customSubDomain = hostname?.split(
      `.${process.env.NEXT_PUBLIC_DOMAIN}`
    )[0];
    console.log("Custom Subdomain:", customSubDomain);

    if (customSubDomain && customSubDomain !== hostname) {
      console.log(
        "Rewriting to subdomain path:",
        `/${customSubDomain}${pathWithSearchParams}`
      );
      return NextResponse.rewrite(
        new URL(`/${customSubDomain}${pathWithSearchParams}`, req.url)
      );
    }

    if (url.pathname === "/sign-in" || url.pathname === "/sign-up") {
      console.log("Redirecting to /agency/sign-in");
      return NextResponse.redirect(new URL(`/agency/sign-in`, req.url));
    }

    if (
      url.pathname === "/" ||
      (url.pathname === "/site" && hostname === process.env.NEXT_PUBLIC_DOMAIN)
    ) {
      console.log("Rewriting to /site");
      return NextResponse.rewrite(new URL("/site", req.url));
    }

    if (
      url.pathname.startsWith("/agency") ||
      url.pathname.startsWith("/subaccount")
    ) {
      console.log("Rewriting path as is:", pathWithSearchParams);
      return NextResponse.rewrite(new URL(`${pathWithSearchParams}`, req.url));
    }

    // If none of the conditions match, allow the request to proceed normally
    return NextResponse.next();
  },
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
