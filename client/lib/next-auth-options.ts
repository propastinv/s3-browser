import { logoutRequest, refreshTokenRequest } from "@/lib/oidc";
import type { Account, AuthOptions, User } from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";
import { JWT } from "next-auth/jwt";
import { ProviderType } from "next-auth/providers/index";

export const authOptions: AuthOptions = {
  providers: [
    KeycloakProvider({
      clientId: process.env.OIDC_CLIENT_ID || "",
      clientSecret: process.env.OIDC_CLIENT_SECRET || "",
      issuer: process.env.OIDC_ISSUER,
      profile: (profile) => {
        profile.id = profile.sub;
        return profile;
      },
    }),
  ],
  events: {
    async signOut({ token }) {
      await logoutRequest(token.refresh_token);
    },
  },
  callbacks: {
    async jwt({
      token,
      account,
      user,
    }: {
      token: JWT;
      account: Account | null;
      user: User | null;
    }) {
      if (account && user) {
        token.access_token = account.access_token;
        token.refresh_token = account.refresh_token;
        token.access_token_expired = Date.now() + (account.expires_in - 15) * 1000;
        token.refresh_token_expired = Date.now() + (account.refresh_expires_in - 15) * 1000;
        token.user = user;
        return token;
      }

      if (Date.now() < (token.access_token_expired ?? 0)) {
        return token;
      }

      try {
        const response = await refreshTokenRequest(token.refresh_token);
        const tokens = response.data;

        if (response.status !== 200) throw new Error("Failed to refresh token");

        return {
          ...token,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token ?? token.refresh_token,
          access_token_expired: Date.now() + (tokens.expires_in - 15) * 1000,
          refresh_token_expired: Date.now() + (tokens.refresh_expires_in - 15) * 1000,
          error: null,
        };
      } catch (e) {
        console.log(e);
        return {
          ...token,
          error: "RefreshAccessTokenError",
          access_token: "",
          refresh_token: "",
        };
      }
    },
    async session({ session, token }) {
      session.user = token.user;
      session.error = token.error;
      session.access_token = token.access_token;
      return session;
    },
  },
};


declare module "next-auth" {
  interface Session {
    user: {
      sub: string;
      email_verified: boolean;
      name: string;
      preferred_username: string;
      avatar_url: string;
      groups: Array<string>;
      position: string;
      given_name: string;
      family_name: string;
      email: string;
      id: string;
      org_name?: string;
      telephone?: string;
    };
    error?: string | null;
    access_token: string;
  }

  interface User {
    sub: string;
    email_verified: boolean;
    name: string;
    telephone: string;
    preferred_username: string;
    avatar_url: string;
    groups: Array<string>;
    position: string;
    org_name: string;
    given_name: string;
    family_name: string;
    email: string;
    id: string;
  }

  interface Account {
    provider: string;
    type: ProviderType;
    id: string;
    access_token: string;
    refresh_token: string;
    idToken: string;
    expires_in: number;
    refresh_expires_in: number;
    token_type: string;
    id_token: string;
    "not-before-policy": number;
    session_state: string;
    scope: string;
  }

  interface Profile {
    sub?: string;
    email_verified: boolean;
    name?: string;
    telephone: string;
    preferred_username: string;
    avatar_url: string;
    groups: Array<string>;
    position: string;
    org_name: string;
    given_name: string;
    family_name: string;
    email?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    access_token: string;
    refresh_token: string;
    refresh_expires_in: number;
    expires_in: number;
    user: {
      sub: string;
      email_verified: boolean;
      name: string;
      telephone: string;
      preferred_username: string;
      avatar_url: string;
      groups: Array<string>;
      position: string;
      org_name: string;
      given_name: string;
      family_name: string;
      email: string;
      id: string;
    };
    error?: string | null;
    access_token_expired?: number;
    refresh_token_expired?: number;
  }
}
