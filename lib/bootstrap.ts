import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function bootstrapAdmin() {
  try {
    const adminUser = await prisma.user.findUnique({
      where: { username: "admin" },
    });

    if (!adminUser) {
      const password = crypto.randomBytes(8).toString("hex");
      const hashedPassword = await bcrypt.hash(password, 10);

      await prisma.user.create({
        data: {
          username: "admin",
          password: hashedPassword,
          role: "superadmin",
        },
      });

      console.log("\n" + "=".repeat(50));
      console.log("INITIAL ADMIN USER CREATED");
      console.log(`Username: admin`);
      console.log(`Password: ${password}`);
      console.log("Please save this password securely!");
      console.log("=".repeat(50) + "\n");
    }
  } catch (error) {
    console.error("Error during admin bootstrap:", error);
  }
}
