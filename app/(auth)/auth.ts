import {compare} from "bcrypt-ts";
import NextAuth, {type DefaultSession} from "next-auth";
import Credentials from "next-auth/providers/credentials";
import {createGuestUser, createUser, getUser} from "@/lib/db/queries";
import {authConfig} from "./auth.config";
import {DUMMY_PASSWORD} from "@/lib/constants";
import type {DefaultJWT} from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";

export type UserType = "guest" | "regular";

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
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    type: UserType;
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



      return token;
    },
    async session({session, token}) {
      if (session.user) {
        session.user.id = token.id;
        session.user.type = token.type;
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
