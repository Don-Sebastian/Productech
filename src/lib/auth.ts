import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { company: true },
        });

        if (!user) {
          throw new Error("User not found");
        }

        if (!user.isActive) {
          throw new Error("Account is deactivated. Contact your administrator.");
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!passwordMatch) {
          throw new Error("Invalid password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          companyId: user.companyId,
          section: user.section,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as any).role;
        token.companyId = (user as any).companyId;
        token.section = (user as any).section;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as any;
        session.user.companyId = token.companyId as string | null;
        session.user.section = token.section as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});

// Helper: Get the dashboard path based on user role
export function getDashboardPath(role: string): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "OWNER":
      return "/owner";
    case "MANAGER":
      return "/manager";
    case "SUPERVISOR":
      return "/supervisor";
    case "OPERATOR":
      return "/operator";
    default:
      return "/login";
  }
}

// Helper: Check if a role can manage another role
export function canManageRole(managerRole: string, targetRole: string): boolean {
  const hierarchy: Record<string, string[]> = {
    ADMIN: ["OWNER"],
    OWNER: ["MANAGER"],
    MANAGER: ["SUPERVISOR", "OPERATOR"],
  };
  return hierarchy[managerRole]?.includes(targetRole) ?? false;
}
