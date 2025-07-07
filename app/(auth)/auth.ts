import {compare} from "bcrypt-ts";
import NextAuth, {type DefaultSession} from "next-auth";
import Credentials from "next-auth/providers/credentials";
import {createUser, getUser} from "@/lib/db/queries";
import {authConfig} from "./auth.config";
import {DUMMY_PASSWORD} from "@/lib/constants";
import type {DefaultJWT} from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";

export type UserType = "regular" | "pro";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      type: UserType;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    email?: string | null;
    type: UserType;
    paddleCustomerId?: string | null; // Added paddleCustomerId
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    type: UserType;
    paddleCustomerId?: string | null; // Added paddleCustomerId
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

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({token, user, account}) {
      // For credentials/guest, user is present and has id/type
      if (user) { // `user` object is available from authorize or initial social sign in
        token.id = user.id as string;
        token.type = user.type;
        token.paddleCustomerId = user.paddleCustomerId; // Assign paddleCustomerId
      }

      // For subsequent Google (or other provider) JWT creations where `user` is not directly passed
      // but we have token.email (e.g., session revalidation)
      // This block might be redundant if the initial `if (user)` covers all cases where `getUser` is implicitly called by NextAuth.
      // However, explicitly fetching to ensure paddleCustomerId is loaded if not already on token.
      if (account?.provider === "google" && token.email && !token.paddleCustomerId) {
        // Only fetch if paddleCustomerId is missing, to avoid redundant DB calls
        const dbUsers = await getUser(token.email);
        if (dbUsers.length > 0) {
          const dbUser = dbUsers[0];
          token.id = dbUser.id; // Ensure id is also fresh if user object wasn't passed
          token.type = dbUser.type || "regular";
          token.paddleCustomerId = dbUser.paddleCustomerId;
        }
      }
      // If it's a credential user and user object was passed, paddleCustomerId is already set.
      // If user object was from `authorize` it should contain all fields from the DB.



      return token;
    },
    async session({session, token}) {
      if (session.user) {
        session.user.id = token.id;
        session.user.type = token.type;
        session.user.paddleCustomerId = token.paddleCustomerId; // Assign paddleCustomerId
      }
      return session;
    },
    async signIn({user, account, profile}) { // Added user to params
      // Ensure paddleCustomerId is on the user object when it's first created or fetched during signIn
      // This is especially for social logins where the user object might be constructed by NextAuth
      // from the profile. We want to ensure our DB user (with paddleCustomerId) is the source of truth.
      if (user && user.email) {
        const dbUsers = await getUser(user.email);
        if (dbUsers.length > 0) {
          // Augment the user object that NextAuth will use to build the token
          // with fields from our database, like paddleCustomerId.
          user.id = dbUsers[0].id; // Make sure our DB ID is used
          user.type = dbUsers[0].type || "regular";
          user.paddleCustomerId = dbUsers[0].paddleCustomerId;
        } else if (account?.provider === "google" && profile?.email) {
          // User does not exist, create them (as done before)
          // The createUser function itself doesn't return paddleCustomerId,
          // it will be null/undefined for a new user, which is fine.
          await createUser(profile.email, '', 'google', 'regular');
          // The user object for the JWT will be constructed in the jwt callback
          // where getUser will be called again, or the initially created user (without paddleId) will be used.
        }
      }
      return true; // Continue with sign-in
    },
  },
});
