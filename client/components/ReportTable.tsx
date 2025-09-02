import { Badge } from "@/components/ui/badge";

interface Order {
  id: string;
  time: string;
  product: string;
  type: "dish" | "drink";
  drinkCategory?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  paymentMethod: "cash" | "electronic";
}

interface Props {
  orders: Order[];
  formatCurrency: (amount: number) => string;
  getDrinkCategoryLabel?: (category: string) => string;
}

export default function ReportTable({ orders, formatCurrency, getDrinkCategoryLabel }: Props) {
  const grandTotal = orders.reduce((sum, o) => sum + o.totalPrice, 0);
  const cashTotal = orders.filter((o) => o.paymentMethod === "cash").reduce((sum, o) => sum + o.totalPrice, 0);
  const electronicTotal = orders.filter((o) => o.paymentMethod === "electronic").reduce((sum, o) => sum + o.totalPrice, 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-4">Heure</th>
            <th className="text-left py-2 px-4">Produit</th>
            <th className="text-left py-2 px-4">Type</th>
            <th className="text-right py-2 px-4">PU</th>
            <th className="text-center py-2 px-4">Qté</th>
            <th className="text-right py-2 px-4">Total</th>
            <th className="text-center py-2 px-4">Paiement</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-b">
              <td className="py-2 px-4 font-mono text-sm">{o.time}</td>
              <td className="py-2 px-4">
                <span className="font-medium">{o.product}</span>
                {o.drinkCategory && (
                  <div className="text-xs text-muted-foreground">
                    {getDrinkCategoryLabel ? getDrinkCategoryLabel(o.drinkCategory) : o.drinkCategory}
                  </div>
                )}
              </td>
              <td className="py-2 px-4">
                <Badge variant={o.type === "dish" ? "default" : "secondary"}>
                  {o.type === "dish" ? "Plat" : "Boisson"}
                </Badge>
              </td>
              <td className="py-2 px-4 text-right">{formatCurrency(o.unitPrice)}</td>
              <td className="py-2 px-4 text-center">{o.quantity}</td>
              <td className="py-2 px-4 text-right font-bold">{formatCurrency(o.totalPrice)}</td>
              <td className="py-2 px-4 text-center">
                <Badge className={o.paymentMethod === "cash" ? "bg-green-600" : "bg-blue-600"}>
                  {o.paymentMethod === "cash" ? "Espèces" : "Électronique"}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2">
            <td colSpan={5} className="text-right font-bold py-2 px-4">TOTAL :</td>
            <td className="text-right font-bold py-2 px-4">{formatCurrency(grandTotal)}</td>
            <td></td>
          </tr>
          <tr>
            <td colSpan={5} className="text-right text-green-600 py-1 px-4">Total espèces :</td>
            <td className="text-right font-bold text-green-600 py-1 px-4">{formatCurrency(cashTotal)}</td>
            <td></td>
          </tr>
          <tr>
            <td colSpan={5} className="text-right text-blue-600 py-1 px-4">Total électronique :</td>
            <td className="text-right font-bold text-blue-600 py-1 px-4">{formatCurrency(electronicTotal)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
