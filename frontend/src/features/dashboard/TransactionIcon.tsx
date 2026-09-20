import { BookOpen, BusFront, Coffee, Receipt, ShoppingBag } from "lucide-react";

// One icon family for every purchase, including unfamiliar categories.
export default function TransactionIcon({ name, category }: { name: string; category: string }) {
  const Icon = /bookstore/i.test(name) ? BookOpen
    : category === "Food & coffee" ? Coffee
    : category === "Shopping" ? ShoppingBag
    : category === "Transportation" ? BusFront
    : Receipt;

  return <Icon size={20} strokeWidth={1.8} aria-hidden="true" />;
}
