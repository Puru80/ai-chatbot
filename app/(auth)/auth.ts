import {compare} from "bcrypt-ts";
import NextAuth, {type DefaultSession} from "next-auth";
import Credentials from "next-auth/providers/credentials";
import {createGuestUser, createUser, getUser, getUserPromptDetails} from "@/lib/db/queries";
import {authConfig} from "./auth.config";
import {DUMMY_PASSWORD} from "@/lib/constants";
import type {DefaultJWT} from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import { entitlementsByUserType } from "@/lib/ai/entitlements";

export type UserType = "guest" | "regular" | "pro";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      type: UserType;
      promptCount: number;
      maxPrompts: number;
      quotaResetsAt: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    email?: string | null;
    type: UserType;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    type: UserType;
    promptCount: number;
    maxPrompts: number;
    quotaResetsAt: string | null;
  }
}

export const {
  handlers: {GET, POST},
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {},
      async authorize({email, password}: any) {
        const users = await getUser(email);

        if (users.length === 0) {
          await compare(password, DUMMY_PASSWORD);
          return null;
        }

        const [user] = users;

        if (!user.password) {
          await compare(password, DUMMY_PASSWORD);
          return null;
        }

        const passwordsMatch = await compare(password, user.password);

        if (!passwordsMatch) return null;

        return {...user, type: "regular"};
      },
    }),
    Credentials({
      id: "guest",
      credentials: {},
      async authorize() {
        const [guestUser] = await createGuestUser();
        return {...guestUser, type: "guest"};
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({token, user, account}) {
      // For credentials/guest, user is present and has id/type
      if (user) {
        console.log('User SignIn detected');
        token.id = user.id as string;
        token.type = user.type;

        // For Google, user is not present after first sign-in, but token.email is
        if (account?.provider === "google" && token.email) {
          console.log('Google SignIn detected');
          const users = await getUser(token.email);
          if (users.length > 0) {
            token.id = users[0].id;
            token.type = users[0].type || "regular";
          }

        }
        return token;
      }

      // For Google, user is not present after first sign-in, but token.email is
      if (account?.provider === "google" && token.email) {
        console.log('Google SignIn detected');
        const users = await getUser(token.email);
        if (users.length > 0) {
          token.id = users[0].id;
          token.type = users[0].type || "regular";
        }

        return token;
      }

      // For Google, user is not present after first sign-in, but token.email is
      // This block might be redundant if the earlier user block handles Google correctly on subsequent calls
      // However, it's here for robustness or specific Google post-first-signin scenarios.
      if (account?.provider === "google" && token.email && !token.id) { // ensure id isn't already set
        console.log('Google JWT enrichment on subsequent calls');
        const users = await getUser(token.email);
        if (users.length > 0) {
          token.id = users[0].id;
          token.type = users[0].type || "regular";
        }
      }

      // Fetch prompt details if token.id and token.type are available
      if (token.id && token.type) {
        try {
          const userDetails = await getUserPromptDetails(token.id as string);
          token.promptCount = userDetails?.prompt_count ?? 0;
          token.maxPrompts = entitlementsByUserType[token.type as UserType]?.maxMessagesPerDay ?? 0;
          token.quotaResetsAt = userDetails?.quota_resets_at ? new Date(userDetails.quota_resets_at).toISOString() : null;
        } catch (error) {
          console.error("Error fetching user prompt details in JWT callback:", error);
          token.promptCount = 0;
          token.maxPrompts = 0; // Consider a default from entitlements for 'guest' if appropriate
          token.quotaResetsAt = null;
        }
      } else {
        // Ensure these fields are initialized even if id/type are missing for some reason
        // (though this shouldn't happen in a normal flow)
        token.promptCount = 0;
        token.maxPrompts = 0;
        token.quotaResetsAt = null;
      }

      return token;
    },
    async session({session, token}) {
      if (session.user) {
        session.user.id = token.id;
        session.user.type = token.type;
        session.user.promptCount = token.promptCount as number;
        session.user.maxPrompts = token.maxPrompts as number;
        session.user.quotaResetsAt = token.quotaResetsAt as string | null;
        // console.log("Session", session);
      }

      return session;
    },
    async signIn({account, profile}) {
      console.log("Profile: ", profile);
      // console.log("Account: ", account);
      if (profile && profile.email) {
        if (account && account.provider === "google") {
          // Ensure the return value is always boolean
          const [user] = await getUser(profile.email);
          if (!user) {
            console.log("User does not exist");
            await createUser(profile.email, '', 'google', 'regular');
          }

          return true;
        }
      }
      return true; // Do different verification for other providers that don't have `email_verified`
    },
  },
});
