import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: "USER" | "OWNER";
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "USER" | "OWNER";
  }
}
