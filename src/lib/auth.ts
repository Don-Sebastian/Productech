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
          include: { company: true, sections: true, ownedCompanies: true },
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
          sections: user.sections.map((s: any) => s.slug),
          ownedCompanies: user.ownedCompanies?.map((c: any) => ({ id: c.id, name: c.name })) || [],
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Only query DB on sign-in or explicit update — never on every request
      if (user) {
        token.id = user.id as string;
        token.name = user.name;
        token.role = (user as any).role;
        token.companyId = (user as any).companyId;
        token.sections = (user as any).sections || [];
        token.ownedCompanies = (user as any).ownedCompanies || [];
      }
      // Allow manual refresh via update() trigger (e.g. after role change)
      if (trigger === "update" && session) {
        // If the update payload includes a new companyId, we just update it
        if (session.companyId) {
          token.companyId = session.companyId;
          return token;
        }

        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { id: true, name: true, role: true, companyId: true, sections: { select: { slug: true } }, isActive: true, ownedCompanies: { select: { id: true, name: true } } },
          });
          if (dbUser && dbUser.isActive) {
            token.name = dbUser.name;
            token.role = dbUser.role;
            token.companyId = dbUser.companyId;
            token.sections = dbUser.sections.map((s: any) => s.slug);
            token.ownedCompanies = dbUser.ownedCompanies || [];
          }
        } catch {
          // Keep existing token data on error
        }
      }
      return token;
    },
    async session({ session, token }) {
      // Read directly from JWT — no DB query
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        (session.user as any).role = token.role;
        (session.user as any).companyId = token.companyId;
        (session.user as any).sections = token.sections || [];
        (session.user as any).ownedCompanies = token.ownedCompanies || [];
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
