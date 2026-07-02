import { redirect } from "next/navigation";

export default function WithdrawalPage() {
  redirect("/movements?type=withdrawal");
}
