import { connection } from "next/server";
import { HomePage } from "@/features/catalog/components/home-page";

export default async function Home() {
  await connection();
  return <HomePage />;
}
