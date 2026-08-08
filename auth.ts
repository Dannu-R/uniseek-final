// Full Auth.js config (Node runtime). Spreads the edge-safe base (providers + gating)
// and adds the pieces that need Prisma. Sessions are JWT-based — no Session table — so
// on each sign-in we upsert the User + Account into the existing schema and stamp the
// DB user id onto the token, making it available on the server session as `user.id`.
import NextAuth from "next-auth";
import authConfig from "@/auth.config";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  callbacks: {
    ...authConfig.callbacks,
    // Runs on sign-in (when `account` is present) and on subsequent token refreshes.
    // On sign-in, adopt the OAuth identity into a User row (by provider + subject id).
    async jwt({ token, account, profile, user }) {
      if (account && profile) {
        const email = typeof profile.email === "string" ? profile.email : null;
        const name =
          (typeof profile.name === "string" ? profile.name : null) ??
          (typeof profile.login === "string" ? profile.login : null) ?? // GitHub username
          user?.name ??
          null;
        const image =
          (typeof profile.picture === "string" ? profile.picture : null) ?? // Google
          (typeof profile.avatar_url === "string" ? profile.avatar_url : null) ?? // GitHub
          user?.image ??
          null;

        const record = await prisma.account.upsert({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
          update: {},
          create: {
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            user: email
              ? {
                  connectOrCreate: {
                    where: { email },
                    create: { email, name, image },
                  },
                }
              : { create: { name, image } },
          },
          select: { userId: true },
        });
        token.uid = record.userId;
      }
      return token;
    },
    // Expose the DB user id on the session so server code can attach Profile / SavedRun.
    async session({ session, token }) {
      if (session.user && typeof token.uid === "string") session.user.id = token.uid;
      return session;
    },
  },
});
