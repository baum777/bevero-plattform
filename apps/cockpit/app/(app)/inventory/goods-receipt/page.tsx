import { redirect } from "next/navigation";

export default function GoodsReceiptPage() {
  redirect("/movements?type=goods_receipt");
}
