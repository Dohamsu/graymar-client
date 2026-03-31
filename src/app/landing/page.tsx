import { redirect } from "next/navigation";

/** /landing → / 리다이렉트 (기존 URL 호환) */
export default function LandingRedirect() {
  redirect("/");
}
